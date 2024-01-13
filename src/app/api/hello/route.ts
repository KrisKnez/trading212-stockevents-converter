import { NextRequest, NextResponse } from "next/server";
import * as csv from "csv";
import dayjs from "dayjs";

interface Trading212Format {
  Action: string;
  Time: string;
  ISIN: string;
  Ticker: string;
  Name: string;
  "No. of shares": string;
  "Price / share": string;
  "Currency (Price / share)": string;
  "Exchange rate": string;
  Result: string;
  "Currency (Result)": string;
  Total: string;
  "Currency (Total)": string;
  ID: string;
  "Currency conversion fee": string;
  "Currency (Currency conversion fee)": string;
}

// Date format should be YYYY-MM-DD
// Decimal places should always be indicated by a dot, not a comma
// Don't include thousands separators or currency symbols
interface StockEventsFormat {
  Symbol: string;
  Date: string;
  Quantity: string;
  Price: string;
}

export async function POST(request: NextRequest) {
  const data = await request.formData();
  const file: File | null = data.get("file") as unknown as File;

  if (!file) {
    return Response.json({ success: false });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const csvParser = csv.parse({
    columns: true,
  });
  const csvTransformer = csv.transform((row: Trading212Format) => {
    const stockEvent: StockEventsFormat = {
      Symbol: row.Ticker,
      Date: dayjs(row.Time).format("YYYY-MM-DD"),
      Quantity: row["No. of shares"],
      Price: row["Price / share"],
    };

    return stockEvent;
  });
  const csvStringifier = csv.stringify({
    header: true,
    columns: ["Symbol", "Date", "Quantity", "Price"],
  });


  csvParser.pipe(csvTransformer).pipe(csvStringifier);

  csvParser.write(buffer);
  csvParser.end();

  const transformedData: string[] = [];

  csvStringifier.on("data", (data: Buffer) => {
    transformedData.push(data.toString());
    // console.log(data.toString())
  });

  // Wait for the transformation to complete before responding
  await new Promise((resolve) => csvStringifier.on("finish", resolve));

  return new Response(transformedData.join(''), {
    headers: {
      "content-type": "text/csv",
    },
  })
}
