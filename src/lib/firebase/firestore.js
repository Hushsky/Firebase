// Import function to generate fake restaurant and review data for testing/development
import { generateFakeRestaurantsAndReviews } from "@/src/lib/fakeRestaurants.js";

// Import Firebase Firestore functions for database operations
import {
  collection,    // Reference to a collection in Firestore
  onSnapshot,    // Real-time listener for document changes
  query,         // Create a query to filter/order documents
  getDocs,       // Get all documents from a query (one-time read)
  doc,           // Reference to a specific document
  getDoc,        // Get a single document (one-time read)
  updateDoc,     // Update an existing document
  orderBy,       // Order query results by a field
  Timestamp,     // Firestore timestamp type for dates
  runTransaction, // Execute multiple operations atomically
  where,         // Filter query results by field values
  addDoc,        // Add a new document to a collection
  getFirestore,  // Get Firestore instance
} from "firebase/firestore";

// Import the Firestore database instance from the client app configuration
import { db } from "@/src/lib/firebase/clientApp";

// Function to update a restaurant's photo URL in the database
export async function updateRestaurantImageReference(
  restaurantId,      // String: unique identifier for the restaurant
  publicImageUrl     // String: the public URL of the uploaded image
) {
  // Create a reference to the specific restaurant document
  const restaurantRef = doc(collection(db, "restaurants"), restaurantId);
  
  // Check if the document reference exists before updating
  if (restaurantRef) {
    // Update the restaurant document with the new photo URL
    await updateDoc(restaurantRef, { photo: publicImageUrl });
  }
}

// Helper function to update restaurant rating statistics within a transaction
// This ensures data consistency when adding new reviews
const updateWithRating = async (
  transaction,        // Firestore transaction object
  docRef,            // Reference to the restaurant document
  newRatingDocument,  // Reference to the new rating document
  review             // Object: the review data to add
) => {
  // Get the current restaurant data within the transaction
  const restaurant = await transaction.get(docRef);
  const data = restaurant.data();
  
  // Calculate new rating statistics
  const newNumRatings = data?.numRatings ? data.numRatings + 1 : 1;  // Increment total ratings count
  const newSumRating = (data?.sumRating || 0) + Number(review.rating);  // Add new rating to sum
  const newAverage = newSumRating / newNumRatings;  // Calculate new average rating

  // Update the restaurant document with new rating statistics
  transaction.update(docRef, {
    numRatings: newNumRatings,  // Total number of ratings
    sumRating: newSumRating,    // Sum of all ratings
    avgRating: newAverage,      // Average rating (sum / count)
  });

  // Add the new rating document to the subcollection
  transaction.set(newRatingDocument, {
    ...review,  // Spread all review properties (rating, text, userId, etc.)
    timestamp: Timestamp.fromDate(new Date()),  // Add current timestamp
  });
};

// Function to add a new review to a restaurant using atomic transactions
export async function addReviewToRestaurant(db, restaurantId, review) {
  // Validate that restaurant ID is provided
  if (!restaurantId) {
    throw new Error("No restaurant ID has been provided.");
  }

  // Validate that review data is provided
  if (!review) {
    throw new Error("A valid review has not been provided.");
  }

  try {
    // Create reference to the restaurant document
    const docRef = doc(collection(db, "restaurants"), restaurantId);
    
    // Create reference to a new rating document in the subcollection
    const newRatingDocument = doc(
      collection(db, `restaurants/${restaurantId}/ratings`)
    );

    // Execute the transaction to update both restaurant stats and add the review
    await runTransaction(db, transaction =>
      updateWithRating(transaction, docRef, newRatingDocument, review)
    );
  } catch (error) {
    // Log error details for debugging
    console.error(
      "There was an error adding the rating to the restaurant",
      error
    );
    // Re-throw the error so calling code can handle it
    throw error;
  }
}

// Helper function to apply filters and sorting to restaurant queries
function applyQueryFilters(q, { category, city, price, sort }) {
  // Filter by restaurant category (e.g., "Italian", "Mexican", etc.)
  if (category) {
    q = query(q, where("category", "==", category));
  }
  
  // Filter by city location
  if (city) {
    q = query(q, where("city", "==", city));
  }
  
  // Filter by price range (price is an array of $ symbols, length determines price level)
  if (price) {
    q = query(q, where("price", "==", price.length));
  }
  
  // Sort by average rating (default) or number of reviews
  if (sort === "Rating" || !sort) {
    q = query(q, orderBy("avgRating", "desc"));  // Highest rated first
  } else if (sort === "Review") {
    q = query(q, orderBy("numRatings", "desc"));  // Most reviewed first
  }
  
  return q;
}

// Function to get all restaurants with optional filtering (one-time read)
export async function getRestaurants(db = db, filters = {}) {
  // Start with a query for all restaurants
  let q = query(collection(db, "restaurants"));

  // Apply filters and sorting to the query
  q = applyQueryFilters(q, filters);
  
  // Execute the query and get all matching documents
  const results = await getDocs(q);
  
  // Transform the results into a plain JavaScript array
  return results.docs.map((doc) => {
    return {
      id: doc.id,                    // Document ID
      ...doc.data(),                // All document data
      // Convert Firestore timestamp to JavaScript Date object
      // Only plain objects can be passed to Client Components from Server Components
      timestamp: doc.data().timestamp.toDate(),
    };
  });
}

// Function to get restaurants with real-time updates (listener)
export function getRestaurantsSnapshot(cb, filters = {}) {
  // Validate that callback is a function
  if (typeof cb !== "function") {
    console.log("Error: The callback parameter is not a function");
    return;
  }

  // Start with a query for all restaurants
  let q = query(collection(db, "restaurants"));
  
  // Apply filters and sorting
  q = applyQueryFilters(q, filters);

  // Set up real-time listener that triggers callback when data changes
  return onSnapshot(q, (querySnapshot) => {
    // Transform the results into a plain JavaScript array
    const results = querySnapshot.docs.map((doc) => {
      return {
        id: doc.id,                    // Document ID
        ...doc.data(),                // All document data
        // Convert Firestore timestamp to JavaScript Date object
        // Only plain objects can be passed to Client Components from Server Components
        timestamp: doc.data().timestamp.toDate(),
      };
    });

    // Call the provided callback with the transformed results
    cb(results);
  });
}

// Function to get a single restaurant by ID (one-time read)
export async function getRestaurantById(db, restaurantId) {
  // Validate that restaurant ID is provided
  if (!restaurantId) {
    console.log("Error: Invalid ID received: ", restaurantId);
    return;
  }
  
  // Create reference to the specific restaurant document
  const docRef = doc(db, "restaurants", restaurantId);
  
  // Get the document data
  const docSnap = await getDoc(docRef);
  
  // Return the document data with converted timestamp
  return {
    ...docSnap.data(),  // All document data
    timestamp: docSnap.data().timestamp.toDate(),  // Convert timestamp to Date
  };
}

// Function to get a single restaurant with real-time updates (listener)
// Note: This function is currently incomplete (just returns)
export function getRestaurantSnapshotById(restaurantId, cb) {
  return;
}

// Function to get all reviews for a specific restaurant (one-time read)
export async function getReviewsByRestaurantId(db, restaurantId) {
  // Validate that restaurant ID is provided
  if (!restaurantId) {
    console.log("Error: Invalid restaurantId received: ", restaurantId);
    return;
  }

  // Create query for the ratings subcollection, ordered by timestamp (newest first)
  const q = query(
    collection(db, "restaurants", restaurantId, "ratings"),
    orderBy("timestamp", "desc")
  );

  // Execute the query and get all matching documents
  const results = await getDocs(q);
  
  // Transform the results into a plain JavaScript array
  return results.docs.map((doc) => {
    return {
      id: doc.id,                    // Document ID
      ...doc.data(),                // All document data
      // Convert Firestore timestamp to JavaScript Date object
      // Only plain objects can be passed to Client Components from Server Components
      timestamp: doc.data().timestamp.toDate(),
    };
  });
}

// Function to get reviews for a restaurant with real-time updates (listener)
export function getReviewsSnapshotByRestaurantId(restaurantId, cb) {
  // Validate that restaurant ID is provided
  if (!restaurantId) {
    console.log("Error: Invalid restaurantId received: ", restaurantId);
    return;
  }

  // Create query for the ratings subcollection, ordered by timestamp (newest first)
  const q = query(
    collection(db, "restaurants", restaurantId, "ratings"),
    orderBy("timestamp", "desc")
  );
  
  // Set up real-time listener that triggers callback when data changes
  return onSnapshot(q, (querySnapshot) => {
    // Transform the results into a plain JavaScript array
    const results = querySnapshot.docs.map((doc) => {
      return {
        id: doc.id,                    // Document ID
        ...doc.data(),                // All document data
        // Convert Firestore timestamp to JavaScript Date object
        // Only plain objects can be passed to Client Components from Server Components
        timestamp: doc.data().timestamp.toDate(),
      };
    });
    
    // Call the provided callback with the transformed results
    cb(results);
  });
}

// Function to populate the database with fake data for testing/development
export async function addFakeRestaurantsAndReviews() {
  // Generate fake restaurant and review data
  const data = await generateFakeRestaurantsAndReviews();
  
  // Loop through each restaurant and its reviews
  for (const { restaurantData, ratingsData } of data) {
    try {
      // Add the restaurant document to the restaurants collection
      const docRef = await addDoc(
        collection(db, "restaurants"),
        restaurantData
      );

      // Add each review to the restaurant's ratings subcollection
      for (const ratingData of ratingsData) {
        await addDoc(
          collection(db, "restaurants", docRef.id, "ratings"),
          ratingData
        );
      }
    } catch (e) {
      // Log errors but continue processing other restaurants
      console.log("There was an error adding the document");
      console.error("Error adding document: ", e);
    }
  }
}
