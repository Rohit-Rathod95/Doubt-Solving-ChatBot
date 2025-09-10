// src/pages/Home.jsx
import React, { useState } from "react";
import DoubtForm from "../components/DoubtForm";
import SolutionDisplay from "../components/SolutionDisplay";
import { Container, Typography } from "@mui/material";

const Home = () => {
  const [solution, setSolution] = useState(null);

  return (
    <Container sx={{ marginTop: 5 }}>
      <Typography variant="h4" gutterBottom>
        JEE/NEET Doubt Solver
      </Typography>

      <DoubtForm setSolution={setSolution} />
      <SolutionDisplay solution={solution} />
    </Container>
  );
};

export default Home;
