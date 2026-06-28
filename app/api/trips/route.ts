import {
  tripsDelete,
  tripsGet,
  tripsPatch,
  tripsPost,
} from "@/lib/trips-route-handlers";

export async function POST(request: Request) {
  return tripsPost(request);
}

export async function GET(request: Request) {
  return tripsGet(request);
}

export async function PATCH(request: Request) {
  return tripsPatch(request);
}

export async function DELETE(request: Request) {
  return tripsDelete(request);
}
