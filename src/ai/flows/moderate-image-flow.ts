'use server';

/**
 * @fileOverview This file defines a Genkit flow to moderate an image for explicit content.
 *
 * - moderateImage - A function that checks if an image is appropriate.
 * - ModerateImageInput - The input type for the moderateImage function.
 * - ModerateImageOutput - The return type for the moderateImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ModerateImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo to be moderated, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ModerateImageInput = z.infer<typeof ModerateImageInputSchema>;

const ModerateImageOutputSchema = z.object({
  isAppropriate: z
    .boolean()
    .describe('Whether or not the image is considered appropriate and safe.'),
  reason: z.string().optional().describe('The reason why the image was flagged as inappropriate.'),
});
export type ModerateImageOutput = z.infer<typeof ModerateImageOutputSchema>;

export async function moderateImage(
  input: ModerateImageInput
): Promise<ModerateImageOutput> {
  return moderateImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'moderateImagePrompt',
  input: {schema: ModerateImageInputSchema},
  output: {schema: ModerateImageOutputSchema},
  prompt: `You are an image moderation expert. Your task is to determine if the provided image contains any explicit, nude, or otherwise inappropriate content for a dating app.

  Analyze the following image:
  Photo: {{media url=photoDataUri}}

  If the image is appropriate, set isAppropriate to true.
  If the image contains nudity, sexually suggestive content, or extreme violence, set isAppropriate to false and provide a brief reason.`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const moderateImageFlow = ai.defineFlow(
  {
    name: 'moderateImageFlow',
    inputSchema: ModerateImageInputSchema,
    outputSchema: ModerateImageOutputSchema,
  },
  async (input) => {
    try {
        const { output, history } = await prompt(input, { returnHistory: true });
        
        // Check if the response was blocked by safety settings
        const lastResponse = history[history.length - 1];
        if(lastResponse.output?.finishReason === 'BLOCKED' && lastResponse.output?.blocked) {
            const blockedReason = lastResponse.output.blocked[0]?.reason;
            let userFriendlyReason = 'Image contains content that violates our safety policy.';
            if (blockedReason === 'SAFETY') {
                userFriendlyReason = 'Image was flagged as sexually explicit and is not allowed.';
            }

            return {
                isAppropriate: false,
                reason: userFriendlyReason
            };
        }

        // Check the structured output from the model
        if (output && !output.isAppropriate) {
          return {
            isAppropriate: false,
            reason: output.reason || 'Image content is not appropriate for the platform.',
          };
        }

        // If not blocked and model says it's appropriate
        return { isAppropriate: true };

    } catch (e: any) {
        // This case handles when the prompt itself fails, which can happen if the input is blocked
        // before the model even runs (e.g., HarmCategory.SEXUALLY_EXPLICIT).
        if (e.message.includes('blocked')) {
             return {
                isAppropriate: false,
                reason: 'Image was flagged as inappropriate by our safety filter.'
            };
        }
        // For other errors, re-throw them.
        console.error("Error in moderation flow:", e);
        throw e;
    }
  }
);
