import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Organization } from './organization';
import { USER_ROLE } from './user-roles';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column()
    age: number;

    @Column()
    email: string;

    @Column({
        type: 'enum',
        enum: USER_ROLE
    })
    role: USER_ROLE;

    @ManyToOne(type => Organization)
    organization: Organization;
}