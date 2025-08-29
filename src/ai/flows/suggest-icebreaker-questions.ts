'use server';

/**
 * @fileOverview This file defines a Genkit flow to suggest icebreaker questions based on a user's profile information.
 *
 * - suggestIcebreakerQuestions - A function that generates icebreaker questions.
 * - SuggestIcebreakerQuestionsInput - The input type for the suggestIcebreakerQuestions function.
 * - SuggestIcebreakerQuestionsOutput - The return type for the suggestIcebreakerQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestIcebreakerQuestionsInputSchema = z.object({
  about: z.string().describe('A description of the user from their profile.'),
});
export type SuggestIcebreakerQuestionsInput = z.infer<typeof SuggestIcebreakerQuestionsInputSchema>;

const SuggestIcebreakerQuestionsOutputSchema = z.object({
  questions: z
    .array(z.string())
    .describe('An array of icebreaker questions to start a conversation.'),
});
export type SuggestIcebreakerQuestionsOutput = z.infer<typeof SuggestIcebreakerQuestionsOutputSchema>;

export async function suggestIcebreakerQuestions(
  input: SuggestIcebreakerQuestionsInput
): Promise<SuggestIcebreakerQuestionsOutput> {
  return suggestIcebreakerQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestIcebreakerQuestionsPrompt',
  input: {schema: SuggestIcebreakerQuestionsInputSchema},
  output: {schema: SuggestIcebreakerQuestionsOutputSchema},
  prompt: `You are a dating assistant who helps users start conversations with each other.

  Based on the following information about the user, suggest 3 icebreaker questions to start a conversation.

  About: {{{about}}}

  The icebreaker questions should be engaging and relevant to the user's interests and personality, as described in the 'about' section.
  Make sure the questions are open-ended and encourage the user to share more about themselves.
  Format the output as a JSON array of strings.
  `,
});

const suggestIcebreakerQuestionsFlow = ai.defineFlow(
  {
    name: 'suggestIcebreakerQuestionsFlow',
    inputSchema: SuggestIcebreakerQuestionsInputSchema,
    outputSchema: SuggestIcebreakerQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
