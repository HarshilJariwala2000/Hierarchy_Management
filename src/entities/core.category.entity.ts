import {
    Entity,
    Tree,
    Column,
    PrimaryGeneratedColumn,
    TreeChildren,
    TreeParent,
    TreeLevelColumn,PrimaryColumn, ManyToOne, JoinTable, JoinColumn, OneToMany
  } from "typeorm"

  @Entity()
  export class CoreCategory{
    @PrimaryGeneratedColumn()
    core_category_id:number

    @Column()
    category_name:string

    @OneToMany((type) => CoreCategory, (category) => category.parent,{nullable:true})
    children: CoreCategory[]

    @Column({nullable:true})
    parent_id:number

    @ManyToOne((type) => CoreCategory, (category) => category.children,{onUpdate:"CASCADE",onDelete:"CASCADE",nullable:true})
    @JoinColumn({name:'parent_id'})
    parent: CoreCategory
  
    @Column({nullable:true})
    depth:number

    @Column({nullable:true})
    is_leaf:boolean
  }