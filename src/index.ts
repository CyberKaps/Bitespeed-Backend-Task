import express from "express";
import identifyRouter from "./routes/identify";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());


app.use("/identify", identifyRouter);

app.get("/", (_, res) => {
  res.send("Bitespeed Identity Service");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});