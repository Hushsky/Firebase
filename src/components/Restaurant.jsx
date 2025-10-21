// This directive tells Next.js that this component should run on the client side
// Client components can use browser APIs, event handlers, and state
"use client";

// This component shows one individual restaurant
// It receives data from src/app/restaurant/[id]/page.jsx
// This is a container component that manages restaurant data and review functionality

// Import React hooks and components for state management and lifecycle
import { React, useState, useEffect, Suspense } from "react";
// Import Next.js dynamic import for code splitting and lazy loading
import dynamic from "next/dynamic";
// Import Firestore function to get real-time restaurant data
import { getRestaurantSnapshotById } from "@/src/lib/firebase/firestore.js";
// Import custom hook to get current user information
import { useUser } from "@/src/lib/getUser";
// Import the RestaurantDetails component that displays restaurant information
import RestaurantDetails from "@/src/components/RestaurantDetails.jsx";
// Import function to upload restaurant images to Firebase Storage
import { updateRestaurantImage } from "@/src/lib/firebase/storage.js";

// Dynamically import ReviewDialog component for lazy loading
// This reduces the initial bundle size by loading the dialog only when needed
const ReviewDialog = dynamic(() => import("@/src/components/ReviewDialog.jsx"));

// Export the main Restaurant component as default
export default function Restaurant({
  id,                // String: unique identifier for the restaurant
  initialRestaurant, // Object: initial restaurant data from server-side rendering
  initialUserId,     // String: user ID from server-side rendering (fallback)
  children,          // React children: any child components passed to this component
}) {
  // State to store the current restaurant details
  // Initialized with data from server-side rendering for better performance
  const [restaurantDetails, setRestaurantDetails] = useState(initialRestaurant);
  
  // State to control whether the review dialog is open or closed
  const [isOpen, setIsOpen] = useState(false);

  // Get the current user ID, with fallback to initialUserId from server
  // The only reason this component needs to know the user ID is to associate a review with the user, and to know whether to show the review dialog
  const userId = useUser()?.uid || initialUserId;
  
  // State to store the current review being written
  const [review, setReview] = useState({
    rating: 0,    // Number: star rating (0-5)
    text: "",     // String: review text content
  });

  // Function to update review state when user types or selects rating
  const onChange = (value, name) => {
    // Use spread operator to update only the specific field that changed
    setReview({ ...review, [name]: value });
  };

  // Async function to handle restaurant image upload
  async function handleRestaurantImage(target) {
    // Get the first file from the file input (if any files were selected)
    const image = target.files ? target.files[0] : null;
    
    // If no image was selected, exit early
    if (!image) {
      return;
    }

    // Upload the image to Firebase Storage and get the download URL
    const imageURL = await updateRestaurantImage(id, image);
    
    // Update the restaurant details with the new image URL
    setRestaurantDetails({ ...restaurantDetails, photo: imageURL });
  }

  // Function to close the review dialog and reset the review form
  const handleClose = () => {
    setIsOpen(false);                    // Hide the dialog
    setReview({ rating: 0, text: "" }); // Reset review form to empty state
  };

  // Effect hook to set up real-time listener for restaurant data
  useEffect(() => {
    // getRestaurantSnapshotById returns a cleanup function
    // This sets up a real-time listener that updates when restaurant data changes
    return getRestaurantSnapshotById(id, (data) => {
      // Update local state whenever Firestore data changes
      setRestaurantDetails(data);
    });
  }, [id]); // Re-run when restaurant ID changes

  // Return the JSX for the Restaurant component
  return (
    // React Fragment to group multiple elements without adding extra DOM nodes
    <>
      {/* RestaurantDetails component displays the main restaurant information */}
      <RestaurantDetails
        restaurant={restaurantDetails}        // Pass current restaurant data
        userId={userId}                      // Pass user ID for authentication
        handleRestaurantImage={handleRestaurantImage}  // Pass image upload handler
        setIsOpen={setIsOpen}                // Pass function to open review dialog
        isOpen={isOpen}                      // Pass current dialog state
      >
        {/* Render any child components passed to Restaurant */}
        {children}
      </RestaurantDetails>
      
      {/* Conditionally render ReviewDialog only if user is logged in */}
      {userId && (
        // Suspense component provides loading fallback for dynamically imported components
        <Suspense fallback={<p>Loading...</p>}>
          {/* ReviewDialog component for writing reviews */}
          <ReviewDialog
            isOpen={isOpen}           // Whether dialog is visible
            handleClose={handleClose} // Function to close dialog
            review={review}           // Current review data
            onChange={onChange}       // Function to update review data
            userId={userId}           // User ID for review submission
            id={id}                   // Restaurant ID for review association
          />
        </Suspense>
      )}
    </>
  );
}
