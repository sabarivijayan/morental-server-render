import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import BookingCarRepository from "../repositories/booking-cars-repositories.js";
import RentableCarHelper from "./rentable-cars-helpers.js";
import sequelize from "../../../config/database.js";

dotenv.config();

// Initialize Razorpay client with credentials from environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class BookingCarHelper {
  // Create a payment order for the car booking
  static async createPaymentOrder(totalPrice, userId, bookingInput) {
    const transaction = await sequelize.transaction();
    try {
      // Step 1: Check vehicle availability
      const isAvailable = await BookingCarRepository.checkCarAvailability(
        bookingInput.rentableId,
        new Date(bookingInput.pickUpDate),
        new Date(bookingInput.dropOffDate),
        { lock: transaction.LOCK.UPDATE } // Add lock to the availability check
      );

      // If the car is not available, return an error message
      if (!isAvailable) {
        return {
          status: "error",
          message: "The car is not available for the selected dates.",
        };
      }

      // Step 2: Create Razorpay order
      const options = {
        amount: totalPrice * 100, // Amount in paise (INR)
        currency: "INR",
        receipt: `receipt_${Date.now()}`, // Unique receipt for tracking
      };

      const razorpayOrder = await razorpay.orders.create(options);

      // Step 3: Add booking input to database with status "pending"
      const bookingData = {
        userId: userId,
        carId: bookingInput.rentableId,
        pickUpDate: new Date(bookingInput.pickUpDate),
        pickUpTime: bookingInput.pickUpTime,
        dropOffDate: new Date(bookingInput.dropOffDate),
        dropOffTime: bookingInput.dropOffTime,
        pickUpLocation: bookingInput.pickUpLocation,
        dropOffLocation: bookingInput.dropOffLocation,
        address: bookingInput.address,
        phoneNumber: bookingInput.phoneNumber,
        totalPrice: totalPrice,
        status: "pending", // Set initial status to "pending"
        razorpayOrderId: razorpayOrder.id,
      };

      // Create a new booking record in the database
      const newBooking = await BookingCarRepository.createBooking(bookingData);

      // Commit the transaction if all operations succeed
      await transaction.commit();

      // Step 4: Return the Razorpay order and booking data
      return {
        status: "success",
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        bookingId: newBooking.id,
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Error in createPaymentOrder:", error);
      throw new Error("Failed to create payment order.");
    }
  }

  // Verify payment and create a booking
  static async verifyPaymentAndCreateBooking(paymentDetails, bookingInput) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentDetails;

    try {
      // Step 1: Generate signature for verification
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      // Step 2: Verify the payment signature
      if (generatedSignature !== razorpaySignature) {
        return {
          status: "error",
          message: "Payment verification failed.",
        };
      }

      // Step 3: Check car availability again before finalizing the booking
      const isAvailable = await BookingCarRepository.checkCarAvailability(
        bookingInput.rentableId,
        new Date(bookingInput.pickUpDate),
        new Date(bookingInput.dropOffDate)
      );

      // If the car is no longer available, return an error message
      if (!isAvailable) {
        return {
          status: "error",
          message: "Car is no longer available for the selected dates.",
        };
      }

      // Step 4: Update the booking status to "booked"
      const updatedBooking = await BookingCarRepository.updateBookedStatus(
        razorpayOrderId,
        "booked"
      );

      // Step 5: Return a success message with booking details
      return {
        status: "success",
        message: "Payment verified and booking confirmed.",
        data: updatedBooking,
      };
    } catch (error) {
      console.error("Error in verifyPaymentAndCreateBooking:", error);
      throw new Error("Payment verification and booking creation failed.");
    }
  }

  // Fetch all bookings made by a user
  static async fetchBookingsByUser(userId) {
    try {
      const bookings = await BookingCarRepository.fetchBookingsByUserId(userId);

      // If no bookings found, return a message indicating that
      if (!bookings || bookings.length === 0) {
        return {
          status: true,
          message: "No bookings found for the user.",
          data: [],
        };
      }

      // Return the bookings if found
      return {
        status: true,
        message: "Bookings fetched successfully.",
        data: bookings,
      };
    } catch (error) {
      console.error("Error in Booking Helper: ", error);
      return {
        status: false,
        message: "Failed to fetch bookings.",
        data: [],
      };
    }
  }

  // Get available cars based on various filters
  static async getAvailableCars(
    pickUpDate,
    dropOffDate,
    query,
    transmissionType,
    fuelType,
    numberOfSeats,
    priceSort,
    maxPrice
  ) {
    try {
      if (query || transmissionType || fuelType || numberOfSeats || priceSort || maxPrice) {
        // If filters are provided, search for rentable cars
        const rentableCars = await RentableCarHelper.searchRentableCars({
          query,
          transmissionType,
          fuelType,
          numberOfSeats,
          priceSort,
          maxPrice,
        });

        const availableCars = [];

        // Step 4: Check availability for each rentable vehicle
        for (const rentable of rentableCars) {
          const isAvailable = await BookingCarRepository.checkCarAvailability(
            rentable.carId,
            pickUpDate,
            dropOffDate
          );

          // If the car is available, add it to the availableCars array
          if (isAvailable) {
            availableCars.push(rentable);
          }
        }

        // Return the list of available cars after filtering
        return {
          status: "success",
          message: "success",
          data: availableCars,
        };
      } else {
        // If no filters are provided, fetch all rentable cars with a price limit
        const rentableCars = await BookingCarRepository.getRentableCars({
          maxPrice,
        });

        const availableCars = [];

        // Check availability for each rentable vehicle
        for (const rentable of rentableCars) {
          const isAvailable = await BookingCarRepository.checkCarAvailability(
            rentable.carId,
            pickUpDate,
            dropOffDate
          );
          // If the car is available, add it to the availableCars array
          if (isAvailable) {
            availableCars.push(rentable);
          }
        }

        // Return the list of available cars
        return {
          status: "success",
          message: "success",
          data: availableCars,
        };
      }
    } catch (error) {
      throw new Error(
        "Failed to fetch available cars. Please try again later."
      );
    }
  }
}

export default BookingCarHelper;
