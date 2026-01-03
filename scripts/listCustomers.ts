import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

async function listCustomers() {
  const customers = await stripe.customers.list();
  return customers;
}

// Usage example:
listCustomers().then(console.log).catch(console.error);
