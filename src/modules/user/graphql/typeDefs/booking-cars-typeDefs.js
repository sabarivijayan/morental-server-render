import {gql} from 'apollo-server-express'

const BookingCarTypeDefs = gql`
  scalar Float
  scalar Int

  type Manufacturer {
    id: ID!
    name: String!
    country: String
  }
  type Car {
    id: ID!
    name: String!
    type: String!
    numberOfSeats: String!
    fuelType: String!
    transmissionType: String!
    description: String!
    quantity: String!
    manufacturer: Manufacturer!
    primaryImageUrl: String
    secondaryImagesUrls: [String]
    year: String!
  }

  type Rentable{
    id: ID!
    carId: ID!
    pricePerDay: Float!
    availableQuantity: Int!
    car: Car!
  }

  type Booking{
    id: ID!
    carId: ID!
    userId: ID!
    pickUpDate: String!
    pickUpTime: String!           # New field for pickup time
    dropOffDate: String!
    dropOffTime: String!          # New field for drop-off time
    pickUpLocation: String!       # New field for pickup location
    dropOffLocation: String!      # New field for drop-off location
    address: String!
    phoneNumber: String!
    totalPrice: Float!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  input GenerateBookingInput{
    rentableId: Int
    carId: ID
    pickUpDate: String!
    pickUpTime: String!           # New field for pickup time
    dropOffDate: String!
    dropOffTime: String!          # New field for drop-off time
    pickUpLocation: String!       # New field for pickup location
    dropOffLocation: String!      # New field for drop-off location
    address: String
    phoneNumber: String!
    totalPrice: Float!
    userInfo: String!
  }

  type PaymentResponse{
    status: String!
    message: String!
    razorpayOrderId: String!
    amount: Float!
    currency: String!
  }

  type GenerateBookingResponse{
    status: String!
    message: String!
    data: Booking
  }

  input PaymentInput{
    razorpayPaymentId: String!
    razorpayOrderId: String!
    razorpaySignature: String!
  }

  type FetchBooking{
    id: ID!
    carId: Int!
    userId: Int!
    pickUpDate: String!
    pickUpTime: String!
    dropOffDate: String!
    dropOffTime: String!
    pickUpLocation: String!
    dropOffLocation: String!
    address: String!
    phoneNumber: String!
    totalPrice: Float!
    status: String
    rentable: Rentable
  }

  type FetchBookingResponse{
    status: Boolean!
    message: String!
    data: [FetchBooking]
  }

  input FilterInput {
    numberOfSeats: [String]
    transmissionTypes: [String]
    fuelTypes: [String]
    maxPrice: Float
    sortBy: String
    sortOrder: String
  }

  type GetAvailableCarsResponse {
    status: String!
    message: String!
    data: [Rentable]
  }

  type Query{
    getAvailableCars(
      pickUpDate: String!
      dropOffDate: String!
      query: String
      transmissionType: [String]
      fuelType: [String]
      numberOfSeats: [Int]
      priceSort: String
      maxPrice: Float
    ): GetAvailableCarsResponse
      
      fetchBookings: FetchBookingResponse!
  }

  type Mutation{
    generatePaymentOrder(totalPrice: Float!, bookingInput: GenerateBookingInput!) : PaymentResponse!
    verifyPaymentAndCreateBooking(paymentDetails: PaymentInput!, bookingInput: GenerateBookingInput!):GenerateBookingResponse!
  }
`;

export default BookingCarTypeDefs;
