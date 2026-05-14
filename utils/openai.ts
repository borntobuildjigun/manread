import OpenAI from 'openai';

export interface AIQuestionResult {
  context: string;
  questions: string[];
}

export const generateBookQuestion = async (
  apiKey: string,
  bookData: { title: string; author: string; currentPage: number; totalPages: number },
  userPastAnswers: string[] = []
): Promise<AIQuestionResult> => {
  if (!apiKey) {
    throw new Error('OpenAI API Key is missing.');
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true, // Needed for React Native
  });

  const prompt = `
당신은 철학적이고 통찰력 있는 독서 파트너입니다.
사용자는 지금 다음 책을 읽고 있습니다:
- 제목: ${bookData.title}
- 저자: ${bookData.author}
- 진행률: 전체 ${bookData.totalPages}페이지 중 ${bookData.currentPage}페이지

${userPastAnswers.length > 0 ? `사용자의 이전 답변들:\n${userPastAnswers.join('\n')}\n` : ''}

이 사용자를 위해 책의 내용이나 주제와 관련된 깊이 있는 생각 거리를 서로 다른 3가지 관점으로 던져주세요.
반드시 아래의 JSON 형식으로만 답변을 반환해야 합니다:
{
  "context": "『${bookData.title}』의 내용을 바탕으로 가볍게 분위기를 환기하는 한 문장 (예: '인간의 본성에 대해 흥미로운 이야기를 읽고 계시네요.')",
  "questions": [
    "첫 번째 질문: 사용자가 깊게 생각하고 답변할 수 있는 질문",
    "두 번째 질문: 다른 각도나 철학적 관점에서의 질문",
    "세 번째 질문: 사용자의 일상이나 이전 답변과 연결되는 질문"
  ]
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful reading assistant. Always respond in valid JSON format matching the requested structure in Korean.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No content received from OpenAI.');

    const parsed = JSON.parse(content);
    return {
      context: parsed.context || `『${bookData.title}』을(를) 읽고 계시네요.`,
      questions: Array.isArray(parsed.questions) && parsed.questions.length > 0 
        ? parsed.questions 
        : ['이 책을 읽으면서 어떤 생각이 드셨나요?']
    };
  } catch (error) {
    console.error('OpenAI Error:', error);
    throw new Error('AI 질문 생성에 실패했습니다.');
  }
};
