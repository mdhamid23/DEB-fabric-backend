import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum UserRole {
  SUPERADMIN = "superadmin",
  ISSUER = "issuer",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  username: string = "";

  @Column({ name: "passwordHash", nullable: true })
  passwordHash?: string = "";

  @Column({ name: "encryptedCaSecret", type: "text", nullable: true })
  encryptedCaSecret: string = "";

  @Column({ name: "role", type: "enum", enum: UserRole })
  role: UserRole = UserRole.ISSUER;

  @Column({
    name: "status",
    type: "enum",
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus = UserStatus.ACTIVE;

  // ── Fabric CA identity ───────────────────────────────────────
  // These are AES-256 encrypted before storing.
  // null until the user logs in for the first time (CA enrollment happens at first login).

  @Column({ name: "encryptedCert", type: "text", nullable: true })
  encryptedCert: string | null = null; // X.509 enrollment certificate (PEM)

  @Column({ name: "encryptedPrivateKey", type: "text", nullable: true })
  encryptedPrivateKey: string | null = null; // Private key (PEM)

  @Column({ name: "fabricCaEnrollmentId", type: "text", nullable: true })
  fabricCaEnrollmentId: string | null = null; // The id registered in Fabric CA (usually = username)

  @Column({ name: "certEnrolledAt", nullable: true })
  certEnrolledAt: Date = new Date(); // When CA enrollment happened

  @Column({ name: "certExpiresAt", nullable: true })
  certExpiresAt: Date = new Date(); // When the enrollment cert expires (default 1y in test-network)

  // ── Audit ────────────────────────────────────────────────────
  @Column({ name: "createdBy", nullable: true })
  createdBy: string = ""; // superadmin username who created this user

  @CreateDateColumn({ name: "createdAt" })
  createdAt: Date = new Date();

  @UpdateDateColumn({ name: "updatedAt" })
  updatedAt: Date = new Date();

  @Column({ name: "deactivatedAt", nullable: true })
  deactivatedAt: Date = new Date();

  @Column({ name: "deactivatedBy", nullable: true })
  deactivatedBy: string = "";
}
