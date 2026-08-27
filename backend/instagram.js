// Gemini se Caption aur Image URL aane ke baad ye code chalega:

export async function publishToInstagram(imageUrl, captionText) {
  const IG_USER_ID = process.env.INSTAGRAM_USER_ID;
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

  // Step 1: Instagram par Media Container Banayein
  const containerResponse = await fetch(
    `https://graph.facebook.com/v21.0/${IG_USER_ID}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl, // Direct JPG Image Link
        caption: captionText,
        access_token: ACCESS_TOKEN,
      }),
    }
  );

  const containerData = await containerResponse.json();
  const creationId = containerData.id;

  // Step 2: 5 Second Wait (Instagram Server Processing)
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Step 3: Instagram Par Post Publish (Live) Karein
  const publishResponse = await fetch(
    `https://graph.facebook.com/v21.0/${IG_USER_ID}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: ACCESS_TOKEN,
      }),
    }
  );

  const publishData = await publishResponse.json();
  return publishData; // Post Published!
}
