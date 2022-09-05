import {
    Entity,
    Tree,
    Column,
    PrimaryGeneratedColumn,
    TreeChildren,
    TreeParent,
    TreeLevelColumn,PrimaryColumn, ManyToOne, JoinTable, JoinColumn, Unique, OneToMany, 
  } from "typeorm"
  
  @Entity()
  export class SubscribedMarketplaces{
    @PrimaryGeneratedColumn("uuid")
    marketplace_name_id:string

    @PrimaryColumn()
    marketplace_name:string

    @Column()
    tenant_id:string
}

@Entity()
@Tree("adjacency-list")
export class TenantCategory {
    @PrimaryGeneratedColumn("uuid")
    tenant_category_id: string
    
    @Column("uuid")
    tenant_id:string

    // @OneToMany(()=>TenantToMarketplaceMapping,(x)=>x.tenantCategory)
    // x:TenantToMarketplaceMapping[]

    @Column({nullable:true})
    category_name: string
  
    @OneToMany((type) => TenantCategory, (category) => category.parent,{nullable:true})
    children: TenantCategory[]
  
    @Column({nullable:true})
    parent_id:string;
  
    @ManyToOne((type) => TenantCategory, (category) => category.children,{onUpdate:"CASCADE",onDelete:"CASCADE"})
    @JoinColumn({name:'parent_id'})
    parent: TenantCategory
  
    @TreeLevelColumn()
    @Column({nullable:true})
    depth:number

    @Column({nullable:true})
    is_leaf:boolean
  }

  @Entity()
  export class TenantToCoreMapping{
    
    @ManyToOne(()=>TenantCategory,(category)=>category.tenant_category_id)
    @JoinColumn([
      {name:"tenant_category_leaf_id", referencedColumnName:"tenant_category_id"},
    ])
    tenant:TenantCategory
    
    @Column()
    tenant_id:string
    // @PrimaryColumn()
    // categoryLeafId:string

    @PrimaryColumn("uuid")
    core_leaf_id:string
  }

  @Entity()
  export class CoreToMarketplaceMapping{
    @PrimaryColumn("uuid")
    core_leaf_id:string

    @PrimaryColumn()
    marketplace_leaf_id:string

    @ManyToOne(()=>SubscribedMarketplaces,(marketplace)=>marketplace.marketplace_name_id)
    @JoinColumn([
      { name: "marketplace_name_id", referencedColumnName: "marketplace_name_id" },
      { name: "marketplace_name", referencedColumnName: "marketplace_name" }
    ])
    marketplace:SubscribedMarketplaces
  }

  @Entity()
  export class TenantToMarketplaceMapping{

    @ManyToOne(()=>TenantCategory,(category)=>category.tenant_category_id)
    @JoinColumn([
      {name:"tenant_category_leaf_id", referencedColumnName:"tenant_category_id"},
    ])
    tenant:TenantCategory

    @Column()
    tenant_id:string

    @ManyToOne(()=>SubscribedMarketplaces,(marketplace)=>marketplace.marketplace_name_id)
    @JoinColumn([
      { name: "marketplace_name_id", referencedColumnName: "marketplace_name_id" },
      { name: "marketplace_name", referencedColumnName: "marketplace_name" }
    ])
    marketplace:SubscribedMarketplaces

    @PrimaryColumn()
    marketplace_leaf_id:string
  }

  @Entity()
  export class TenantHierarchyLevel{
    @PrimaryColumn()
    tenant_id:string

    @Column({nullable:true})
    level:number
  }
