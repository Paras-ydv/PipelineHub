import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../config/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return { token: this.jwt.sign({ sub: user.id, email: user.email, role: user.role }), user: this.sanitize(user) };
  }

  async register(email: string, username: string, password: string) {
    const exists = await this.prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (exists) throw new ConflictException('User already exists');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({ data: { email, username, passwordHash } });
    return { token: this.jwt.sign({ sub: user.id, email: user.email, role: user.role }), user: this.sanitize(user) };
  }

  async validateUser(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  private sanitize(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
