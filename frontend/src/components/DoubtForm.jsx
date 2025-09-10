// src/components/DoubtForm.jsx
import React, { useState } from "react";
import axios from "axios";
import { 
  TextField, 
  Button, 
  Box, 
  MenuItem, 
  CircularProgress,
  Alert,
  Typography,
  Chip,
  Paper,
  InputAdornment
} from "@mui/material";
import { School, Calculate, Science, Psychology } from "@mui/icons-material";

const DoubtForm = ({ setSolution }) => {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const subjects = [
    { value: "physics", label: "Physics", icon: <Science /> },
    { value: "chemistry", label: "Chemistry", icon: <Science /> },
    { value: "mathematics", label: "Mathematics", icon: <Calculate /> },
    { value: "biology", label: "Biology", icon: <Psychology /> }
  ];

  const getUserId = () => {
    // Try multiple auth sources
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const sessionUser = JSON.parse(sessionStorage.getItem('user') || '{}');
    
    return user.id || user._id || sessionUser.id || sessionUser._id || `guest_${Date.now()}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    const userId = getUserId();
    
    // Simple validation
    if (!subject) {
      setError("Please select a subject");
      return;
    }
    
    if (query.trim().length < 5) {
      setError("Question too short (minimum 5 characters)");
      return;
    }
    
    if (query.length > 1500) {
      setError("Question too long (maximum 1500 characters)");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/chat",
        {
          userId,
          query: query.trim(),
          subject
        },
        { timeout: 45000 }
      );

      if (response.data.success) {
        setSolution(response.data);
        setQuery("");
      } else {
        setError(response.data.error || "Failed to get solution");
      }
    } catch (err) {
      console.error("Request failed:", err);
      
      let errorMessage = "Failed to process question";
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = "Request timeout - please try a shorter question";
      } else if (err.response?.status === 429) {
        errorMessage = "Too many requests - please wait a moment";
      } else if (!err.response) {
        errorMessage = "Network error - check your connection";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const charCount = query.length;
  const wordCount = query.trim().split(/\s+/).filter(w => w.length > 0).length;
  const isOverLimit = charCount > 1500 || wordCount > 200;
  const isWarning = charCount > 1200 || wordCount > 150;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <School color="primary" />
        Ask Your Question
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
        <Typography variant="body2" color="text.secondary">
          💡 <strong>Tips:</strong> Be specific, include given values with units, mention the topic/chapter
        </Typography>
      </Paper>

      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          select
          fullWidth
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          sx={{ mb: 2 }}
          required
          disabled={loading}
        >
          {subjects.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {option.icon}
                {option.label}
              </Box>
            </MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          label="Your Question"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          multiline
          rows={5}
          required
          disabled={loading}
          error={isOverLimit}
          placeholder="Example: A 5kg mass is accelerated at 2m/s². Find the applied force using Newton's second law."
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Chip
                  size="small"
                  label={`${charCount}/1500`}
                  color={isOverLimit ? 'error' : isWarning ? 'warning' : 'default'}
                />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Words: {wordCount}/200
          </Typography>
          {isWarning && (
            <Typography variant="caption" color={isOverLimit ? 'error' : 'warning'}>
              {isOverLimit ? '❌ Too long' : '⚠️ Consider shortening'}
            </Typography>
          )}
        </Box>

        <Button 
          variant="contained" 
          type="submit"
          disabled={loading || !query.trim() || !subject || isOverLimit}
          fullWidth
          size="large"
          sx={{ py: 1.5 }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} color="inherit" />
              Solving...
            </Box>
          ) : (
            'Get Solution'
          )}
        </Button>
        
        {loading && (
          <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, color: 'text.secondary' }}>
            Processing your question (20-45 seconds)...
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default DoubtForm;