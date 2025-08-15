/**
 * Chainlink Functions Script for AI Matching
 * This script will be executed by Chainlink Functions to call external AI APIs
 * for freelancer-task matching and return results to the smart contract
 */

// The source code will be executed in the Chainlink Functions environment
const source = `
  // API endpoint for AI matching service (mock for hackathon)
  const aiMatchingAPI = "https://api.swiftytask.ai/match";
  
  // Extract task data from request
  const taskId = args[0];
  const requiredSkills = JSON.parse(args[1]);
  const budgetUSD = parseInt(args[2]);
  const deadline = parseInt(args[3]);
  const isUrgent = args[4] === "true";
  
  // Prepare request payload
  const requestData = {
    taskId: taskId,
    requiredSkills: requiredSkills,
    budgetUSD: budgetUSD,
    deadline: deadline,
    isUrgent: isUrgent,
    maxMatches: 5
  };
  
  try {
    // Make HTTP request to AI matching service
    const response = await Functions.makeHttpRequest({
      url: aiMatchingAPI,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${secrets.AI_API_KEY}\`
      },
      data: requestData
    });
    
    if (response.error) {
      throw new Error(\`API Error: \${response.error.message}\`);
    }
    
    // Parse the response
    const matches = response.data.matches;
    
    if (!matches || matches.length === 0) {
      // Return empty result if no matches found
      return Functions.encodeString(JSON.stringify({
        success: false,
        matches: [],
        error: "No suitable matches found"
      }));
    }
    
    // Format matches for smart contract
    const formattedMatches = matches.map(match => ({
      freelancer: match.freelancerAddress,
      score: Math.min(100, Math.max(0, match.score)), // Ensure score is 0-100
      matchingSkills: match.matchingSkills,
      estimatedCompletion: match.estimatedCompletionHours
    }));
    
    // Return successful result
    return Functions.encodeString(JSON.stringify({
      success: true,
      matches: formattedMatches,
      timestamp: Date.now()
    }));
    
  } catch (error) {
    // Handle errors gracefully
    console.error("AI Matching Error:", error);
    
    // Fallback: Return rule-based matching
    const fallbackMatches = generateFallbackMatches(requiredSkills, budgetUSD);
    
    return Functions.encodeString(JSON.stringify({
      success: true,
      matches: fallbackMatches,
      fallback: true,
      error: error.message
    }));
  }
  
  // Fallback matching algorithm (rule-based)
  function generateFallbackMatches(skills, budget) {
    // Mock freelancer database for fallback
    const mockFreelancers = [
      {
        address: "0x1234567890123456789012345678901234567890",
        skills: ["JavaScript", "React", "Node.js"],
        reputation: 85,
        completedTasks: 15
      },
      {
        address: "0x2345678901234567890123456789012345678901",
        skills: ["Python", "Django", "Machine Learning"],
        reputation: 92,
        completedTasks: 28
      },
      {
        address: "0x3456789012345678901234567890123456789012",
        skills: ["UI/UX", "Figma", "Graphic Design"],
        reputation: 88,
        completedTasks: 22
      }
    ];
    
    return mockFreelancers
      .filter(freelancer => {
        // Simple skill matching
        return skills.some(skill => 
          freelancer.skills.some(fSkill => 
            fSkill.toLowerCase().includes(skill.toLowerCase())
          )
        );
      })
      .map(freelancer => {
        // Calculate match score
        const skillMatches = skills.filter(skill =>
          freelancer.skills.some(fSkill =>
            fSkill.toLowerCase().includes(skill.toLowerCase())
          )
        );
        
        const skillScore = (skillMatches.length / skills.length) * 50;
        const reputationScore = (freelancer.reputation / 100) * 30;
        const experienceScore = Math.min(20, freelancer.completedTasks);
        
        return {
          freelancer: freelancer.address,
          score: Math.round(skillScore + reputationScore + experienceScore),
          matchingSkills: skillMatches,
          estimatedCompletion: Math.max(8, budget / 25) // Rough estimate
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }
`;

// Consumer contract configuration
const consumerAddress = "YOUR_CONSUMER_CONTRACT_ADDRESS";
const subscriptionId = "YOUR_SUBSCRIPTION_ID";

// Secrets for API authentication
const secrets = {
  AI_API_KEY: "your_ai_api_key_here"
};

// Gas limit for the request
const gasLimit = 300000;

module.exports = {
  source,
  consumerAddress,
  subscriptionId,
  secrets,
  gasLimit
};
