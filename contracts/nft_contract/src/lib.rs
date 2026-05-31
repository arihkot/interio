#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String};

#[cfg(test)]
extern crate std;

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
        let owner_key = symbol_short!("owner");
        env.storage().instance().set(&(owner_key, id), &to);
    }

    pub fn get_metadata(env: Env, id: u32) -> Option<NftMetadata> {
        env.storage().instance().get(&id)
    }

    pub fn get_owner(env: Env, id: u32) -> Option<Address> {
        let owner_key = symbol_short!("owner");
        env.storage().instance().get(&(owner_key, id))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_mint_and_read_metadata() {
        let env = Env::default();
        let contract_id = env.register(ModelNftContract, ());
        let client = ModelNftContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        env.mock_all_auths();

        client.mint(
            &user,
            &1u32,
            &String::from_str(&env, "My Design"),
            &String::from_str(&env, "https://example.com/model.obj"),
            &String::from_str(&env, "1500"),
            &String::from_str(&env, "50"),
        );

        let metadata = client.get_metadata(&1u32).unwrap();
        assert_eq!(metadata.name, String::from_str(&env, "My Design"));
        assert_eq!(
            metadata.model_url,
            String::from_str(&env, "https://example.com/model.obj")
        );
        assert_eq!(metadata.total_cost, String::from_str(&env, "1500"));
        assert_eq!(metadata.maintenance, String::from_str(&env, "50"));

        let owner = client.get_owner(&1u32).unwrap();
        assert_eq!(owner, user);
    }

    #[test]
    fn test_get_nonexistent_returns_none() {
        let env = Env::default();
        let contract_id = env.register(ModelNftContract, ());
        let client = ModelNftContractClient::new(&env, &contract_id);

        assert!(client.get_metadata(&999u32).is_none());
        assert!(client.get_owner(&999u32).is_none());
    }

    #[test]
    fn test_mint_multiple_nfts() {
        let env = Env::default();
        let contract_id = env.register(ModelNftContract, ());
        let client = ModelNftContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        env.mock_all_auths();

        client.mint(
            &user,
            &1u32,
            &String::from_str(&env, "First"),
            &String::from_str(&env, "https://example.com/first.obj"),
            &String::from_str(&env, "1000"),
            &String::from_str(&env, "30"),
        );
        client.mint(
            &user,
            &2u32,
            &String::from_str(&env, "Second"),
            &String::from_str(&env, "https://example.com/second.obj"),
            &String::from_str(&env, "2000"),
            &String::from_str(&env, "60"),
        );

        assert_eq!(
            client.get_metadata(&1u32).unwrap().name,
            String::from_str(&env, "First")
        );
        assert_eq!(
            client.get_metadata(&2u32).unwrap().name,
            String::from_str(&env, "Second")
        );
    }

    #[test]
    fn test_mint_different_owners() {
        let env = Env::default();
        let contract_id = env.register(ModelNftContract, ());
        let client = ModelNftContractClient::new(&env, &contract_id);

        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        env.mock_all_auths();

        client.mint(
            &alice,
            &1u32,
            &String::from_str(&env, "Alice Design"),
            &String::from_str(&env, "https://example.com/alice.obj"),
            &String::from_str(&env, "500"),
            &String::from_str(&env, "10"),
        );
        client.mint(
            &bob,
            &2u32,
            &String::from_str(&env, "Bob Design"),
            &String::from_str(&env, "https://example.com/bob.obj"),
            &String::from_str(&env, "3000"),
            &String::from_str(&env, "90"),
        );

        assert_eq!(client.get_owner(&1u32).unwrap(), alice);
        assert_eq!(client.get_owner(&2u32).unwrap(), bob);
    }

    #[test]
    fn test_mint_same_id_overwrites() {
        let env = Env::default();
        let contract_id = env.register(ModelNftContract, ());
        let client = ModelNftContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        env.mock_all_auths();

        client.mint(
            &user,
            &1u32,
            &String::from_str(&env, "Original"),
            &String::from_str(&env, "https://example.com/orig.obj"),
            &String::from_str(&env, "100"),
            &String::from_str(&env, "5"),
        );
        client.mint(
            &user,
            &1u32,
            &String::from_str(&env, "Updated"),
            &String::from_str(&env, "https://example.com/upd.obj"),
            &String::from_str(&env, "200"),
            &String::from_str(&env, "10"),
        );

        let metadata = client.get_metadata(&1u32).unwrap();
        assert_eq!(metadata.name, String::from_str(&env, "Updated"));
        assert_eq!(metadata.total_cost, String::from_str(&env, "200"));
    }
}
