import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { lines } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    // Process in batches if too many lines, but for now let's try a reasonable amount
    // We'll ask Groq to identify names, years, and places in each line.
    const prompt = `
      Analyze the following lines of text and identify any Names, Years, or Places.
      Return the result as a JSON object with a "results" key.
      The "results" key should contain an array of objects, where each object has:
      - index: the original line index (as a number)
      - entities: an array of objects with { text: string, type: 'name' | 'year' | 'place' }
      
      Only include lines that actually have entities.
      
      Lines:
      ${lines.map((line: string, i: number) => `${i}: ${line}`).join('\n')}
    `;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts entities (Names, Years, Places) from text. Respond ONLY with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return NextResponse.json(result);
  } catch (error) {
    console.error('Groq API error:', error);
    return NextResponse.json({ error: 'Failed to analyze text' }, { status: 500 });
  }
}
