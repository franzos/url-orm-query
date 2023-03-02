import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Address } from './address';

@Entity()
export class Organization {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    type: string;

    @Column({
        type: 'jsonb',
    })
    address: Address
}