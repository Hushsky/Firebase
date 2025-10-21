// This directive tells Next.js that this component should run on the client side
// Client components can use browser APIs, event handlers, and state
"use client";

// This component handles the review dialog and uses a Next.js feature known as Server Actions to handle the form submission
// Server Actions allow form submissions to be handled on the server without creating API routes

// Import React hooks for managing component state and lifecycle
import { useEffect, useLayoutEffect, useRef } from "react";
// Import the RatingPicker component that allows users to select a star rating
import RatingPicker from "@/src/components/RatingPicker.jsx";
// Import the server action function that will handle form submission on the server
import { handleReviewFormSubmission } from "@/src/app/actions.js";

// Define the ReviewDialog component with destructured props
const ReviewDialog = ({
  isOpen,        // Boolean: controls whether the dialog is visible
  handleClose,   // Function: called to close the dialog
  review,        // Object: contains the current review data (text, rating, etc.)
  onChange,      // Function: called when user types in the review text
  userId,        // String: ID of the user submitting the review
  id,            // String: ID of the restaurant being reviewed
}) => {
  // Create a ref to directly access the HTML dialog element
  // Refs allow us to call native DOM methods like showModal() and close()
  const dialog = useRef();

  // useLayoutEffect runs synchronously after all DOM mutations
  // This ensures the dialog opens/closes immediately without visual delay
  useLayoutEffect(() => {
    // If the dialog should be open, show it as a modal
    if (isOpen) {
      // showModal() makes the dialog appear with a backdrop and focus management
      dialog.current.showModal();
    } else {
      // If the dialog should be closed, hide it
      dialog.current.close();
    }
  }, [isOpen, dialog]); // Re-run when isOpen or dialog ref changes

  // Event handler for clicks on the dialog
  const handleClick = (e) => {
    // Check if the click was on the dialog backdrop (not the content)
    // When you click outside the modal content, close the dialog
    if (e.target === dialog.current) {
      // Call the parent component's close function
      handleClose();
    }
  };

  // Return the JSX for the dialog component
  return (
    // HTML dialog element with ref and click handler
    <dialog ref={dialog} onMouseDown={handleClick}>
      {/* Form element that will submit to a server action */}
      <form
        // Server action: Next.js will handle this form submission on the server
        action={handleReviewFormSubmission}
        // When form is submitted, close the dialog
        onSubmit={() => {
          handleClose();
        }}
      >
        {/* Dialog header with title */}
        <header>
          <h3>Add your review</h3>
        </header>
        {/* Main content area of the dialog */}
        <article>
          {/* Rating picker component for selecting star rating */}
          <RatingPicker />

          {/* Paragraph containing the text input for review */}
          <p>
            <input
              type="text"                    // Text input field
              name="text"                    // Form field name for server action
              id="review"                    // HTML id for accessibility
              placeholder="Write your thoughts here"  // Placeholder text
              required                       // Field is required before submission
              value={review.text}            // Controlled input: value comes from state
              onChange={(e) => onChange(e.target.value, "text")}  // Update state when typing
            />
          </p>

          {/* Hidden input to pass restaurant ID to server action */}
          <input type="hidden" name="restaurantId" value={id} />
          {/* Hidden input to pass user ID to server action */}
          <input type="hidden" name="userId" value={userId} />
        </article>
        {/* Dialog footer with action buttons */}
        <footer>
          {/* Menu element for button group */}
          <menu>
            {/* Cancel button that resets form and closes dialog */}
            <button
              autoFocus                    // Automatically focus this button when dialog opens
              type="reset"                 // Reset button clears the form
              onClick={handleClose}       // Also close the dialog when clicked
              className="button--cancel"  // CSS class for styling
            >
              Cancel
            </button>
            {/* Submit button that sends form to server action */}
            <button type="submit" value="confirm" className="button--confirm">
              Submit
            </button>
          </menu>
        </footer>
      </form>
    </dialog>
  );
};

// Export the component as the default export
export default ReviewDialog;
