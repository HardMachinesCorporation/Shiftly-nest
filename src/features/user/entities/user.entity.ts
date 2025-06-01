import IUser from '../../../shared/types/user/user.interface';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User implements IUser {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  email: string;
  @Column()
  name: string;
  @Column()
  password: string;
  @Column()
  avatar: string;
  @DeleteDateColumn({ nullable: true })
  deleteAt: Date | null;
  @CreateDateColumn({ nullable: false })
  createdAt: Date;
}
