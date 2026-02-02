/**
 * IPFS storage utilities using Pinata
 */

const PINATA_API_KEY = process.env.PINATA_API_KEY!;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_API_KEY!;
const PINATA_JWT = process.env.PINATA_JWT!;
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';

/**
 * Upload JSON metadata to IPFS
 */
export async function uploadToIPFS(data: any): Promise<string> {
  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: data,
        pinataMetadata: {
          name: `auction-metadata-${Date.now()}`,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Pinata API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.IpfsHash;
  } catch (error) {
    console.error('Failed to upload to IPFS:', error);
    throw error;
  }
}

/**
 * Upload file to IPFS
 */
export async function uploadFileToIPFS(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const metadata = JSON.stringify({
      name: file.name,
    });
    formData.append('pinataMetadata', metadata);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Pinata API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.IpfsHash;
  } catch (error) {
    console.error('Failed to upload file to IPFS:', error);
    throw error;
  }
}

/**
 * Get IPFS content URL
 */
export function getIPFSUrl(hash: string): string {
  return `https://${PINATA_GATEWAY}/ipfs/${hash}`;
}

/**
 * Fetch content from IPFS
 */
export async function fetchFromIPFS<T = any>(hash: string): Promise<T> {
  try {
    const response = await fetch(getIPFSUrl(hash));
    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch from IPFS:', error);
    throw error;
  }
}

/**
 * Upload multiple files and return array of hashes
 */
export async function uploadMultipleFilesToIPFS(files: File[]): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadFileToIPFS(file));
  return await Promise.all(uploadPromises);
}
