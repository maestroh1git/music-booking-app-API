import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ token: string }> {
    try {
      // validate registerDto
      if (!registerDto?.email || !registerDto?.password) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(registerDto?.password, 10);

      // Create the user
      const user = await this.usersService.create({
        ...registerDto,
        password: hashedPassword,
      });

      // Generate JWT token
      const token = this.generateToken(user);

      return { token };
    } catch (error) {
      throw new UnauthorizedException(error, 'Invalid credentials');
    }
  }

  async login(loginDto: LoginDto): Promise<{ token: string }> {
    // Find the user by email
    const user = await this.usersService.findByEmail(loginDto?.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(
      loginDto?.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateToken(user);

    return { token };
  }

  private generateToken(user: UserDocument): string {
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  async validateUser(id: string): Promise<UserDocument> {
    return this.usersService.findOne(id);
  }
}
