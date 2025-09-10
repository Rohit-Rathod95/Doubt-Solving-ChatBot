// src/components/SolutionDisplay.jsx
import React from "react";
import StepCard from "./StepCard";
import { Typography, Box, Paper, Chip } from "@mui/material";
import { CheckCircle, Timer } from "@mui/icons-material";

const SolutionDisplay = ({ solution }) => {
  if (!solution || !solution.steps) return null;

  const { steps, finalAnswer, metadata } = solution;

  return (
    <Box sx={{ mt: 3 }}>
      {/* Solution Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle color="success" />
          Solution ({steps.length} steps)
        </Typography>
        {metadata && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              size="small" 
              label={metadata.subject} 
              color="primary" 
              variant="outlined" 
            />
            {metadata.responseTime && (
              <Chip 
                size="small" 
                label={`${Math.round(metadata.responseTime / 1000)}s`} 
                icon={<Timer />}
                variant="outlined"
              />
            )}
            {solution.cached && (
              <Chip size="small" label="Cached" color="info" variant="outlined" />
            )}
          </Box>
        )}
      </Box>

      {/* Steps */}
      {steps.map((step) => (
        <StepCard key={step.step} step={step} />
      ))}

      {/* Final Answer */}
      {finalAnswer && finalAnswer !== "See solution steps above" && (
        <Paper 
          elevation={2}
          sx={{ 
            p: 3, 
            mt: 2,
            background: 'linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%)',
            border: '2px solid #4caf50',
            borderRadius: 2
          }}
        >
          <Typography variant="h6" sx={{ color: 'success.dark', mb: 1, fontWeight: 600 }}>
            🎯 Final Answer
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              fontSize: '1.1rem', 
              fontWeight: 500,
              color: 'text.primary'
            }}
          >
            {finalAnswer}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default SolutionDisplay;

