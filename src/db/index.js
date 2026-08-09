import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import dns from "node:dns/promises";
console.log(await dns.getServers());
if (process.env.MONGODB_URL?.includes("mongodb+srv")) {
  dns.setServers(["1.1.1.1"]);
}
// [ '127.0.0.53' ] // this is the default dns server for linux system, it is a local dns resolver that forwards requests to the actual dns servers.
// it is not a public dns server, so it cannot be used to resolve domain names. that is why we are setting the dns server to

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
      // "mongodb+srv://Aditya:Aditya123@cluster1.rff7t0w.mongodb.net/my_database"
      // "mongodb://localhost:27017/my_database"
    );
    console.log(
      `\nMongoDB connected !! DB HOST: ${connectionInstance.connection.host}\n`
    );
  } catch (error) {
    console.error("MongoDB connection error: ", error.message);
    process.exit(1);
  }
};
export default connectDB;
