import {
    Entity,
    Tree,
    Column,
    PrimaryGeneratedColumn,
    PrimaryColumn, ManyToOne, Unique, OneToMany, JoinColumn, 
  } from "typeorm"
  
  @Entity()
  export class Marketplaces{
    @PrimaryGeneratedColumn()
    marketplace_name_id:number

    @PrimaryColumn()
    marketplace_name:string
}

@Entity()
export class MarketplaceCategory{
    @PrimaryGeneratedColumn()
    marketplace_category_id:number

    @Column()
    category_name: string

    @Column()
    marketplace_name_id:number

    @Column()
    marketplace_name:string

    @ManyToOne(()=>Marketplaces,(marketplace)=>marketplace.marketplace_name_id)
    @JoinColumn([
      { name: "marketplace_name_id", referencedColumnName: "marketplace_name_id" },
      { name: "marketplace_name", referencedColumnName: "marketplace_name" }
    ])
    marketplace:Marketplaces

    @OneToMany((type) => MarketplaceCategory, (category) => category.parent,{nullable:true})
    children: MarketplaceCategory[]

    @Column({nullable:true})
    parent_id:number

    @ManyToOne((type) => MarketplaceCategory, (category) => category.children,{onUpdate:"CASCADE",onDelete:"CASCADE",nullable:true})
    @JoinColumn({name:'parent_id'})
    parent: MarketplaceCategory
  
    @Column({nullable:true})
    depth:number

    @Column({nullable:true})
    is_leaf:boolean
    
}
