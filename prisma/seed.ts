import {
  PrismaClient,
  UserRole,
  ContractType,
  ShiftType,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clear existing data
  console.log("🧹 Clearing existing data...");
  await prisma.$transaction([
    prisma.employeeKPI.deleteMany(),
    prisma.departmentKPI.deleteMany(),
    prisma.kPI.deleteMany(),
    prisma.document.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.payroll.deleteMany(),
    prisma.leaveRequest.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.employeeTraining.deleteMany(),
    prisma.training.deleteMany(),
    prisma.performanceReview.deleteMany(),
    prisma.task.deleteMany(),
    prisma.project.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.position.deleteMany(),
    prisma.department.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log("✅ Database cleared");

  // Create admin user
  console.log("👤 Creating admin user...");
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      email: "admin@company.com",
      password: hashedPassword,
      role: UserRole.SUPERADMIN,
    },
  });

  // Create departments
  console.log("🏢 Creating departments...");
  const departments = await Promise.all([
    prisma.department.create({
      data: {
        name: "Executive",
        description: "Executive Management",
        managerId: adminUser.id,
      },
    }),
    prisma.department.create({
      data: {
        name: "Human Resources",
        description: "HR Department",
      },
    }),
    prisma.department.create({
      data: {
        name: "Engineering",
        description: "Software Development",
      },
    }),
    prisma.department.create({
      data: {
        name: "Finance",
        description: "Finance and Accounting",
      },
    }),
  ]);

  // Create positions
  console.log("💼 Creating positions...");
  const positions = await Promise.all([
    // Executive positions
    prisma.position.create({
      data: {
        title: "Chief Executive Officer",
        description: "CEO",
        minSalary: 200000,
        maxSalary: 300000,
        departmentId: departments[0].id,
      },
    }),
    // HR positions
    prisma.position.create({
      data: {
        title: "HR Manager",
        description: "Human Resources Manager",
        minSalary: 80000,
        maxSalary: 120000,
        departmentId: departments[1].id,
      },
    }),
    prisma.position.create({
      data: {
        title: "HR Specialist",
        description: "Human Resources Specialist",
        minSalary: 50000,
        maxSalary: 80000,
        departmentId: departments[1].id,
      },
    }),
    // Engineering positions
    prisma.position.create({
      data: {
        title: "Engineering Manager",
        description: "Engineering Team Lead",
        minSalary: 120000,
        maxSalary: 180000,
        departmentId: departments[2].id,
      },
    }),
    prisma.position.create({
      data: {
        title: "Senior Software Engineer",
        description: "Senior Developer",
        minSalary: 90000,
        maxSalary: 140000,
        departmentId: departments[2].id,
      },
    }),
    // Finance positions
    prisma.position.create({
      data: {
        title: "Finance Manager",
        description: "Finance Department Head",
        minSalary: 90000,
        maxSalary: 140000,
        departmentId: departments[3].id,
      },
    }),
  ]);

  // Create admin employee
  console.log("👔 Creating admin employee...");
  await prisma.employee.create({
    data: {
      userId: adminUser.id,
      employeeId: `EMP-${randomInt(10000, 99999)}`,
      firstName: "Admin",
      lastName: "User",
      dateOfBirth: new Date("1980-01-01"),
      gender: "MALE",
      phoneNumber: "+1234567890",
      emergencyContact: "+1987654321",
      address: "123 Admin St",
      city: "Metropolis",
      country: "USA",
      postalCode: "10001",
      dateOfHire: new Date("2020-01-01"),
      contractType: ContractType.FULL_TIME,
      shiftType: ShiftType.MORNING,
      departmentId: departments[0].id,
      positionId: positions[0].id,
      isActive: true,
    },
  });

  // Create sample employees
  console.log("👥 Creating sample employees...");
  const employeeData = [
    {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@company.com",
      role: UserRole.EMPLOYEE,
      position: positions[4], // Senior Software Engineer
      department: departments[2], // Engineering
      salary: 120000,
    },
    {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@company.com",
      role: UserRole.HR,
      position: positions[1], // HR Manager
      department: departments[1], // HR
      salary: 100000,
    },
    {
      firstName: "Robert",
      lastName: "Johnson",
      email: "robert.johnson@company.com",
      role: UserRole.FINANCE,
      position: positions[5], // Finance Manager
      department: departments[3], // Finance
      salary: 110000,
    },
  ];

  for (const emp of employeeData) {
    const hashedPassword = await bcrypt.hash("password123", 12);
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email,
        password: hashedPassword,
        role: emp.role,
      },
    });

    await prisma.employee.create({
      data: {
        userId: user.id,
        employeeId: `EMP-${randomInt(10000, 99999)}`,
        firstName: emp.firstName,
        lastName: emp.lastName,
        dateOfBirth: new Date(
          1985 + Math.floor(Math.random() * 10),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1,
        ),
        gender: ["MALE", "FEMALE", "OTHER"][Math.floor(Math.random() * 3)],
        phoneNumber: `+1${Math.floor(2000000000 + Math.random() * 9000000000)}`,
        emergencyContact: `+1${Math.floor(2000000000 + Math.random() * 9000000000)}`,
        address: `${Math.floor(100 + Math.random() * 900)} ${["Main", "Oak", "Pine", "Maple", "Cedar"][Math.floor(Math.random() * 5)]} St`,
        city: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"][
          Math.floor(Math.random() * 5)
        ],
        country: "USA",
        postalCode: Math.floor(10000 + Math.random() * 90000).toString(),
        dateOfHire: new Date(
          2020 + Math.floor(Math.random() * 3),
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1,
        ),
        contractType: [
          ContractType.FULL_TIME,
          ContractType.PART_TIME,
          ContractType.CONTRACT,
        ][Math.floor(Math.random() * 3)],
        shiftType: [ShiftType.MORNING, ShiftType.AFTERNOON, ShiftType.NIGHT][
          Math.floor(Math.random() * 3)
        ],
        departmentId: emp.department.id,
        positionId: emp.position.id,
        isActive: true,
      },
    });
  }

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
