#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol};

#[contracttype]
pub struct NftMetadata {
    pub name: String,
    pub model_url: String,
    pub total_cost: String,
    pub maintenance: String,
}

#[contract]
pub struct ModelNftContract;

#[contractimpl]
impl ModelNftContract {
    pub fn mint(
        env: Env,
        to: Address,
        id: u32,
        name: String,
        model_url: String,
        total_cost: String,
        maintenance: String,
    ) {
        to.require_auth();
        
        let metadata = NftMetadata {
            name,
            model_url,
            total_cost,
            maintenance,
        };
        
        // Store NFT metadata under (Symbol::new("NFT"), id)
        env.storage().instance().set(&id, &metadata);
        
        // Store owner
        let owner_key = Symbol::short("owner");
        env.storage().instance().set(&(owner_key, id), &to);
    }

    pub fn get_metadata(env: Env, id: u32) -> Option<NftMetadata> {
        env.storage().instance().get(&id)
    }

    pub fn get_owner(env: Env, id: u32) -> Option<Address> {
        let owner_key = Symbol::short("owner");
        env.storage().instance().get(&(owner_key, id))
    }
}
