import OpenAI from 'openai';

export class BackgroundService {
  private openai: OpenAI | undefined;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async generateBackground(gameId: string): Promise<string> {
    try {
      if (!this.openai) {
        // No API key available, use fallback
        return this.getFallbackBackground();
      }

      const prompt = this.createBackgroundPrompt();
      
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "vivid"
      });

      if (!response.data?.[0]?.url) {
        throw new Error('No image URL returned from DALL-E');
      }

      return response.data[0].url;
    } catch (error) {
      console.error('Failed to generate background for game', gameId, error);
      
      // Return fallback background URL or empty string
      return this.getFallbackBackground();
    }
  }

  private createBackgroundPrompt(): string {
    const styles = [
      "cartoon ocean scene with bright blue waters and fluffy white clouds",
      "stylized naval battle scene with colorful ships in PopCap art style",
      "vibrant ocean vista with cartoon waves and seagulls flying overhead",
      "whimsical maritime scene with lighthouses and sailing ships in bright colors",
      "animated ocean background with tropical islands and crystal blue water",
      "colorful naval theme with anchors, wheels, and ocean waves in game art style"
    ];

    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    
    return `A ${randomStyle}, highly stylized game graphics similar to PopCap Games aesthetic, bright and vibrant colors, smooth cartoon rendering, suitable as a background for a battleship board game, no text or UI elements, panoramic view`;
  }

  private getFallbackBackground(): string {
    // Array of free ocean/naval themed background images
    const fallbackBackgrounds = [
      'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1024&h=1024&fit=crop',
      'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1024&h=1024&fit=crop',
      'https://images.unsplash.com/photo-1569163139394-de4e4f43e4e5?w=1024&h=1024&fit=crop',
      'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=1024&h=1024&fit=crop',
      'https://images.unsplash.com/photo-1571771019784-3ff35f4f4277?w=1024&h=1024&fit=crop'
    ];

    return fallbackBackgrounds[Math.floor(Math.random() * fallbackBackgrounds.length)];
  }

  async preGenerateBackgrounds(count: number = 5): Promise<string[]> {
    const promises = Array(count).fill(null).map(() => 
      this.generateBackground('pregenerator')
    );

    try {
      const backgrounds = await Promise.all(promises);
      return backgrounds.filter(bg => bg && bg.length > 0);
    } catch (error) {
      console.error('Failed to pre-generate backgrounds:', error);
      return [];
    }
  }

  validateImageUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('https://') && (
        url.includes('oaidalleapiprodscus.blob.core.windows.net') ||
        url.includes('images.unsplash.com') ||
        url.includes('cdn.') ||
        url.includes('img.')
      );
    } catch {
      return false;
    }
  }

  async downloadAndCache(imageUrl: string): Promise<string> {
    // In a production environment, you might want to download the image
    // and store it in your own CDN/storage service to avoid external dependencies
    // For now, we'll just return the URL as-is
    return imageUrl;
  }

  isServiceAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  getServiceStatus(): { available: boolean; provider: string } {
    return {
      available: this.isServiceAvailable(),
      provider: this.isServiceAvailable() ? 'OpenAI DALL-E' : 'Fallback'
    };
  }
}