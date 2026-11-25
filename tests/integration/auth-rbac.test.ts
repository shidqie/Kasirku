import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { login, createUser, updateUser, resetPassword } from "@/services/auth.service";

describe("Auth & RBAC Service Integration Tests", () => {
  let ownerUser: any;
  let testStaffUser: any;

  beforeAll(async () => {
    // Pastikan ada owner
    ownerUser = await prisma.user.findFirst({ where: { role: "OWNER" } });
    if (!ownerUser) {
      ownerUser = await prisma.user.create({
        data: {
          username: "testowner",
          nama: "Test Owner",
          passwordHash: "$2a$10$wK1b8N1FqM2tF/9mFm7HqOPv89xY3q1a5yJ8n8dFk1.",
          role: "OWNER",
        },
      });
    }
  });

  afterAll(async () => {
    // Bersihkan user testing
    await prisma.user.deleteMany({
      where: {
        username: { in: ["teststaff_rbac", "teststaff_new", "test_duplikat"] },
      },
    });
  });

  it("User Story A1: Owner dapat membuat akun staff baru tanpa registrasi publik", async () => {
    const created = await createUser(
      {
        username: "teststaff_rbac",
        nama: "Staff Baru Uji",
        passwordPlain: "StaffPassword123!",
        role: "STAFF",
      },
      ownerUser.id
    );

    expect(created).toBeDefined();
    expect(created.username).toBe("teststaff_rbac");
    expect(created.role).toBe("STAFF");
    expect(created.aktif).toBe(true);

    testStaffUser = created;
  });

  it("User Story A1: Tidak boleh membuat user dengan username duplikat", async () => {
    await expect(
      createUser(
        {
          username: "teststaff_rbac",
          nama: "Duplikat",
          passwordPlain: "StaffPassword123!",
          role: "STAFF",
        },
        ownerUser.id
      )
    ).rejects.toThrow("sudah digunakan");
  });

  it("User Story A1: Login berhasil dengan kredensial yang tepat", async () => {
    const loginResult = await login("teststaff_rbac", "StaffPassword123!");
    expect(loginResult.success).toBe(true);
    expect(loginResult.user?.username).toBe("teststaff_rbac");
    expect(loginResult.user?.role).toBe("STAFF");
  });

  it("User Story A1: Login gagal dengan password salah", async () => {
    const loginResult = await login("teststaff_rbac", "PasswordSalah123!");
    expect(loginResult.success).toBe(false);
    expect(loginResult.message).toContain("salah");
  });

  it("User Story A1: Owner dapat menonaktifkan akun staff dan login ditolak setelahnya", async () => {
    await updateUser(testStaffUser.id, { aktif: false }, ownerUser.id);

    const loginResult = await login("teststaff_rbac", "StaffPassword123!");
    expect(loginResult.success).toBe(false);
    expect(loginResult.message).toContain("dinonaktifkan");

    // Aktifkan kembali
    await updateUser(testStaffUser.id, { aktif: true }, ownerUser.id);
  });

  it("User Story A1: Owner dapat mereset password staff", async () => {
    const resetRes = await resetPassword(testStaffUser.id, "NewPassword999!", ownerUser.id);
    expect(resetRes.success).toBe(true);

    // Coba login dengan password baru
    const loginResult = await login("teststaff_rbac", "NewPassword999!");
    expect(loginResult.success).toBe(true);
  });
});

