const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export interface Milestone {
  name: string;
  description: string;
  percentage: number;
  xlm: number;
}

interface GenerateMilestonesResponse {
  milestones: Milestone[];
}

export const generateMilestones = async (
  projectDescription: string,
  totalXLM: number
): Promise<Milestone[]> => {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === "YOUR_OPENAI_API_KEY_HERE") {
    return getMockMilestones(totalXLM);
  }

  const prompt = `You are a freelance project milestone planner for Filipino freelancers using blockchain escrow.

Given this project: "${projectDescription}"
Total budget: ${totalXLM} XLM on Stellar testnet

Break it into exactly 3 milestones with fair payment splits.
Return ONLY valid JSON, no markdown, no explanation.

Format:
{
  "milestones": [
    {
      "name": "short name (3-4 words)",
      "description": "what gets delivered (max 8 words)",
      "percentage": 30,
      "xlm": 30.00
    }
  ]
}

Rules:
- Percentages must sum to 100
- XLM values must sum to ${totalXLM}
- Make milestones specific to the project type`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content
    .replace(/```json|```/g, "")
    .trim();
  const parsed: GenerateMilestonesResponse = JSON.parse(text);

  return parsed.milestones;
};

const getMockMilestones = (totalXLM: number): Milestone[] => {
  const amt = parseFloat(String(totalXLM));
  return [
    {
      name: "Initial Wireframes",
      description: "Layouts and structure approved by client",
      percentage: 30,
      xlm: parseFloat((amt * 0.3).toFixed(2)),
    },
    {
      name: "Design & Development",
      description: "Core build completed and functional",
      percentage: 40,
      xlm: parseFloat((amt * 0.4).toFixed(2)),
    },
    {
      name: "Final Delivery",
      description: "Revisions done, files handed over",
      percentage: 30,
      xlm: parseFloat((amt * 0.3).toFixed(2)),
    },
  ];
};