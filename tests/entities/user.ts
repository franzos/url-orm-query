import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Organization } from './organization';

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

    @ManyToOne(type => Organization)
    organization: Organization;
}

function getParams<T>(params: Partial<T>) {
    return params;
}

const result = getParams<User>({
    firstName: 'Some',
    lastName: 'One',
    age: 21,

});