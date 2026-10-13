export interface EmployeeProps {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobId?: string;
  zoneId?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class EmployeeEntity {
  private readonly _id: string;
  private _code: string;
  private _firstName: string;
  private _lastName: string;
  private _email: string;
  private _phone?: string;
  private _jobId?: string;
  private _zoneId?: string;
  private _isActive: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: EmployeeProps) {
    this._id = props.id;
    this._code = props.code;
    this._firstName = props.firstName;
    this._lastName = props.lastName;
    this._email = props.email;
    this._phone = props.phone;
    this._jobId = props.jobId;
    this._zoneId = props.zoneId;
    this._isActive = props.isActive ?? true;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  // Getters
  public get id(): string {
    return this._id;
  }

  public get code(): string {
    return this._code;
  }

  public get firstName(): string {
    return this._firstName;
  }

  public get lastName(): string {
    return this._lastName;
  }

  public get fullName(): string {
    return `${this._firstName} ${this._lastName}`.trim();
  }

  public get email(): string {
    return this._email;
  }

  public get phone(): string | undefined {
    return this._phone;
  }

  public get jobId(): string | undefined {
    return this._jobId;
  }

  public get zoneId(): string | undefined {
    return this._zoneId;
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  // Domain methods
  public activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  public deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  public updatePersonalInfo(params: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }): void {
    if (params.firstName !== undefined) {
      this._firstName = params.firstName;
    }
    if (params.lastName !== undefined) {
      this._lastName = params.lastName;
    }
    if (params.email !== undefined) {
      this._email = params.email;
    }
    if (params.phone !== undefined) {
      this._phone = params.phone;
    }
    this._updatedAt = new Date();
  }

  public assignJob(jobId: string): void {
    this._jobId = jobId;
    this._updatedAt = new Date();
  }

  public assignZone(zoneId: string): void {
    this._zoneId = zoneId;
    this._updatedAt = new Date();
  }

  public toPrimitives(): EmployeeProps {
    return {
      id: this._id,
      code: this._code,
      firstName: this._firstName,
      lastName: this._lastName,
      email: this._email,
      phone: this._phone,
      jobId: this._jobId,
      zoneId: this._zoneId,
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
