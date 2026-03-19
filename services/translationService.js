export class TranslationService {
    async detectLanguage(text) {
        if (!('ai' in self) || !('languageDetector' in self.ai)) {
            return 'en'; // Fallback to EN if detector is not available
        }
        
        try {
            const capabilities = await self.ai.languageDetector.capabilities();
            if (capabilities.available === 'no') return 'en';
            
            const detector = await self.ai.languageDetector.create();
            const results = await detector.detect(text.slice(0, 1000));
            return results[0]?.detectedLanguage || 'en';
        } catch (error) {
            console.warn('Language detection failed:', error);
            return 'en';
        }
    }

    async translate(text, targetLang = 'pt') {
        if (!('ai' in self) || !('translator' in self.ai)) {
            console.warn('Translator API not available');
            return text;
        }

        try {
            const sourceLang = await this.detectLanguage(text);
            if (sourceLang === targetLang) return text;

            const capabilities = await self.ai.translator.capabilities();
            const availability = capabilities.languagePairAvailable(sourceLang, targetLang);
            
            if (availability === 'no') {
                console.warn(`Translation pair ${sourceLang}->${targetLang} not available.`);
                return text;
            }

            const translator = await self.ai.translator.create({
                sourceLanguage: sourceLang,
                targetLanguage: targetLang
            });

            return await translator.translate(text);
        } catch (error) {
            console.error('Translation failed:', error);
            return text;
        }
    }
}
