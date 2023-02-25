import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Organization {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    type: string;
}