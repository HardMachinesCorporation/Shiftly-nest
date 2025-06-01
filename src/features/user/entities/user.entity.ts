import IUser from '../../../shared/types/user/user.interface';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
}
