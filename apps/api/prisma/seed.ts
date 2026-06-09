// import { PrismaClient } from "./generated/client";
// import type { Item, Order, Prisma, User } from "./generated/client";

// import { PrismaPg } from "@prisma/adapter-pg";

// import { faker } from "@faker-js/faker";

// const adapter = new PrismaPg({
//   connectionString: process.env.DATABASE_URL!,
// });

// const prisma = new PrismaClient({ adapter });

// const NUM_USERS = 10000;
// const NUM_ITEMS = 1000;
// const MAX_ORDER_ITEMS = 25;
// const MAX_USER_ORDERS = 10;

// main()
//   .catch((e) => {
//     console.error("❌ Error seeding database:", e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });

// async function main() {
//   console.log("🌱 Seeding database...");

//   // Delete existing rows
//   await prisma.orderItem.deleteMany();
//   await prisma.item.deleteMany();
//   await prisma.order.deleteMany();
//   await prisma.user.deleteMany();

//   await createUsers();
//   console.log(`✅ Created users`);

//   await createItems();
//   console.log(`✅ Created items`);

//   const users = await prisma.user.findMany();

//   for (const b of batch(users, 100)) {
//     const orderData: Prisma.OrderCreateManyInput[] = [];

//     for (const user of b) {
//       orderData.push(...createOrdersData(user));
//     }

//     await prisma.order.createMany({
//       data: orderData,
//     });
//   }

//   console.log(`✅ Created orders`);

//   const items = await prisma.item.findMany();
//   const next = nextRandom(items);

//   const orders = await prisma.order.findMany();

//   for (const b of batch(orders, 1000)) {
//     const orderItemsData: Prisma.OrderItemCreateManyInput[] = [];

//     for (const order of b) {
//       orderItemsData.push(...createOrderItemsData(order, next));
//     }

//     await prisma.orderItem.createMany({
//       data: orderItemsData,
//     });
//   }

//   console.log(`✅ Created order items`);
// }

// async function createUsers() {
//   const users: Prisma.UserCreateManyInput[] = [];

//   for (const _ of range(NUM_USERS)) {
//     const firstName = faker.person.firstName();
//     const lastName = faker.person.lastName();

//     users.push({
//       firstName,
//       lastName,
//       email: faker.internet.email({
//         firstName,
//         lastName: `${lastName}${faker.number.int({ min: 1, max: 2000 })}`,
//       }),
//     });
//   }

//   await prisma.user.createMany({
//     data: users,
//   });
// }

// async function createItems() {
//   const items: Prisma.ItemCreateManyInput[] = [];

//   for (const _ of range(NUM_ITEMS)) {
//     items.push({
//       name: faker.commerce.productName(),
//       description: faker.commerce.productDescription(),
//       category: faker.commerce.product(),
//       price: faker.commerce.price({ dec: 2, max: 2000, min: 9.99 }),
//       upc: faker.commerce.upc(),
//     });
//   }

//   await prisma.item.createMany({
//     data: items,
//   });
// }

// function createOrdersData(user: User) {
//   const numOrders = faker.number.int({ min: 1, max: MAX_USER_ORDERS });

//   return Array.from({ length: numOrders }).map(() => ({
//     userId: user.id,
//     createdAt: faker.date.past({ years: 1 }),
//   }));
// }

// function createOrderItemsData(order: Order, next: () => Item) {
//   const numItems = faker.number.int({ min: 1, max: MAX_ORDER_ITEMS });

//   return Array.from({ length: numItems }).map(() => {
//     const item = next();

//     return {
//       orderId: order.id,
//       itemId: item.id,
//       count: faker.number.int({ min: 1, max: 3 }),
//       price: item.price,
//     };
//   });
// }

// // =====
// // utils
// // =====
// export function random(max: number, inclusive: boolean = false) {
//   return Math.floor(Math.random() * max) + Number(inclusive);
// }

// // Randomize (mutate) the order of elements in an array
// export function randomize<T>(arr: T[]) {
//   const len = arr.length;
//   let end = len - 1;

//   // We only need to loop len - 1 times because the final element would just swap with itself
//   for (const _ of range(len - 1)) {
//     const idx = random(end);

//     // swap
//     [arr[idx], arr[end]] = [arr[end], arr[idx]];

//     end--;
//   }
// }

// export function nextRandom<T>(input: T[]) {
//   const arr = [...input];
//   randomize(arr);

//   let start = 0;

//   // This will cycle through the array and wrap around to the beginning as needed
//   return function next(): T {
//     if (start === arr.length) {
//       start = 0;
//     }

//     const el = arr[start];

//     start++;

//     return el;
//   };
// }

// /* Create an iterator that can be used to range from 1 to n */
// function* range(n: number) {
//   for (let i = 1; i <= n; i++) {
//     yield i;
//   }
// }

// function* batch<T>(arr: T[], size: number) {
//   for (let i = 0; i < arr.length; i += size) {
//     yield arr.slice(i, i + size);
//   }
// }
