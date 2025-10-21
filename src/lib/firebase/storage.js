// Import Firebase Storage functions for file upload and management
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// Import the Firebase Storage instance from the client app configuration
import { storage } from "@/src/lib/firebase/clientApp";

// Import function to update restaurant document with new image URL
import { updateRestaurantImageReference } from "@/src/lib/firebase/firestore";

// Main function to handle restaurant image upload and database update
export async function updateRestaurantImage(restaurantId, image) {
    try {
      // Validate that restaurant ID is provided
      if (!restaurantId) {
        throw new Error("No restaurant ID has been provided.");
      }
  
      // Validate that image file is provided and has a name
      if (!image || !image.name) {
        throw new Error("A valid image has not been provided.");
      }
  
      // Upload the image to Firebase Storage and get the public URL
      const publicImageUrl = await uploadImage(restaurantId, image);
      
      // Update the restaurant document in Firestore with the new image URL
      await updateRestaurantImageReference(restaurantId, publicImageUrl);
  
      // Return the public URL for immediate use in the UI
      return publicImageUrl;
    } catch (error) {
      // Log the error for debugging purposes
      console.error("Error processing request:", error);
    }
  }
  
  // Helper function to upload image file to Firebase Storage
  async function uploadImage(restaurantId, image) {
    // Create a structured file path for organizing images by restaurant
    // Format: images/{restaurantId}/{filename}
    const filePath = `images/${restaurantId}/${image.name}`;
    
    // Create a reference to the file location in Firebase Storage
    const newImageRef = ref(storage, filePath);
    
    // Upload the file to Firebase Storage
    // uploadBytesResumable allows for resumable uploads and progress tracking
    await uploadBytesResumable(newImageRef, image);
  
    // Get the public download URL for the uploaded file
    // This URL can be used to display the image in the application
    return await getDownloadURL(newImageRef);
  }