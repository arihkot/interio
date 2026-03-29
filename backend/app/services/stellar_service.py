import subprocess
import os
import re
import logging
import random

CONTRACT_ID = "CD2V73KLOFGWJTQNKTBIHQMPXKHE5MPYOA4QCH422M365XXKACDRM76W"

def mint_stellar_nft(project_id: str, total_cost: str, maintenance: str, model_url: str) -> dict:
    """
    Calls the actual Soroban contract minting on Stellar testnet using CLI.
    """
    logger = logging.getLogger(__name__)
    
    try:
        nft_id = random.randint(1000, 1000000)
        
        cmd = [
            "stellar", "contract", "invoke", 
            "--id", CONTRACT_ID, 
            "--network", "testnet", 
            "--source", "alice", 
            "--", "mint", 
            "--to", "alice",
            "--id", str(nft_id),
            "--name", f"Interio_{project_id[:6]}",
            "--model_url", model_url,
            "--total_cost", str(total_cost),
            "--maintenance", str(maintenance)
        ]
        
        # Execute the transaction
        process = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        # Find the URL in the output
        output = process.stdout + process.stderr
        explorer_url = ""
        match = re.search(r'https://stellar\.expert/explorer/testnet/tx/\S+', output)
        if match:
            explorer_url = match.group(0)
        else:
            explorer_url = f"https://stellar.expert/explorer/testnet/contract/{CONTRACT_ID}"
            
        return {
            "status": "success",
            "explorer_url": explorer_url,
            "message": "NFT minted successfully on Stellar Testnet!"
        }
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to mint Stellar NFT: {e.stderr}")
        return {
            "status": "error",
            "message": f"Contract invocation failed: {e.stderr}"
        }
    except Exception as e:
        logger.error(f"Failed to mint Stellar NFT: {e}")
        return {
            "status": "error",
            "message": str(e)
        }
