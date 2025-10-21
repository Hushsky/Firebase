// Import Google AI Genkit components for AI-powered text generation
import { gemini20Flash, googleAI } from "@genkit-ai/googleai";
// Import the main Genkit framework for AI operations
import { genkit } from "genkit";
// Import Firestore function to fetch restaurant reviews from database
import { getReviewsByRestaurantId } from "@/src/lib/firebase/firestore.js";
// Import function to get authenticated Firebase app for server-side operations
import { getAuthenticatedAppForUser } from "@/src/lib/firebase/serverApp";
// Import Firestore instance getter from Firebase SDK
import { getFirestore } from "firebase/firestore";

// Async function component that generates AI-powered review summaries
// This is a server component that runs on the server, not in the browser
export async function GeminiSummary({ restaurantId }) {
  // Get an authenticated Firebase app instance for server-side database access
  // This allows the server to read data from Firestore with proper permissions
  const { firebaseServerApp } = await getAuthenticatedAppForUser();
  
  // Fetch all reviews for the specific restaurant from Firestore
  // This gets the raw review data that will be sent to the AI model
  const reviews = await getReviewsByRestaurantId(
    getFirestore(firebaseServerApp),  // Pass the authenticated Firestore instance
    restaurantId                      // Filter reviews for this specific restaurant
  );

  // Define a separator character to distinguish between different reviews
  // This helps the AI model understand where one review ends and another begins
  const reviewSeparator = "@";
  
  // Create a prompt (instruction) for the AI model
  // This tells the AI what to do with the review data
  const prompt = `
    Based on the following restaurant reviews, 
    where each review is separated by a '${reviewSeparator}' character, 
    create a one-sentence summary of what people think of the restaurant. 

    Here are the reviews: ${reviews.map((review) => review.text).join(reviewSeparator)}
  `;

  // Wrap AI operations in try-catch to handle potential errors gracefully
  try {
    // Check if the required API key is configured in environment variables
    // The Gemini API key is needed to authenticate with Google's AI services
    if (!process.env.GEMINI_API_KEY) {
      // Make sure GEMINI_API_KEY environment variable is set:
      // https://firebase.google.com/docs/genkit/get-started
      throw new Error(
        'GEMINI_API_KEY not set. Set it with "firebase apphosting:secrets:set GEMINI_API_KEY"'
      );
    }

    // Configure a Genkit AI instance with Google AI integration
    const ai = genkit({
      plugins: [googleAI()],        // Use Google AI as the AI provider
      model: gemini20Flash,         // Use Gemini 2.0 Flash model for fast, efficient processing
    });
    
    // Send the prompt to the AI model and get the generated summary text
    const { text } = await ai.generate(prompt);

    // Return JSX component with the AI-generated summary
    return (
      <div className="restaurant__review_summary">
        {/* Display the AI-generated summary text */}
        <p>{text}</p>
        {/* Attribution text showing that Gemini AI was used */}
        <p>✨ Summarized with Gemini</p>
      </div>
    );
  } catch (e) {
    // Log the error to the console for debugging purposes
    console.error(e);
    // Return a user-friendly error message if AI processing fails
    return <p>Error summarizing reviews.</p>;
  }
}

// Loading skeleton component shown while AI is processing the summary
// This provides better user experience by showing something instead of blank space
export function GeminiSummarySkeleton() {
  return (
    <div className="restaurant__review_summary">
      {/* Loading message to indicate AI processing is in progress */}
      <p>✨ Summarizing reviews with Gemini...</p>
    </div>
  );
}
