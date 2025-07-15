export const getQuizResult = (score) => {
    if (score <= 6) {
        return {
            level: 'Hors cible',
            gift: 'Un stylo pour noter vos futures idées'
        };
    } else if (score <= 12) {
        return {
            level: 'Lead faible',
            gift: 'Notre guide des meilleures astuces aménagement'
        };
    } else if (score <= 18) {
        return {
            level: 'Lead moyen',
            gift: 'Une consultation gratuite de 15 minutes'
        };
    } else {
        return {
            level: 'Lead fort',
            gift: 'Une étude 3D personnalisée de votre projet'
        };
    }
};
