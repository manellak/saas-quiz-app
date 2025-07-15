import { useState } from 'react';
import { useRouter } from 'next/router';
import { db } from '../../../lib/firebase';
import { collection, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { getQuizResult } from '../../../utils/scoring';
import Head from 'next/head';

// Components
const QuestionCard = ({ question, onAnswer }) => (
    <div className="w-full max-w-2xl p-8 space-y-8 bg-white rounded-2xl shadow-lg transform transition-all duration-500">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800">{question.questionText}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {question.answers.map((answer, index) => (
                <button
                    key={index}
                    onClick={() => onAnswer(answer.score)}
                    className="p-4 text-lg font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-blue-500 hover:text-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-all duration-200"
                >
                    {answer.text}
                </button>
            ))}
        </div>
    </div>
);

const LeadForm = ({ onSubmit }) => {
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '' });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg">
            <h2 className="text-3xl font-bold text-center text-gray-800">Presque fini !</h2>
            <p className="text-center text-gray-600">Entrez vos informations pour découvrir votre résultat.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="firstName" placeholder="Prénom" onChange={handleChange} required className="w-full px-4 py-3 text-gray-700 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input type="text" name="lastName" placeholder="Nom" onChange={handleChange} required className="w-full px-4 py-3 text-gray-700 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input type="email" name="email" placeholder="Email" onChange={handleChange} required className="w-full px-4 py-3 text-gray-700 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input type="tel" name="phone" placeholder="Téléphone" onChange={handleChange} required className="w-full px-4 py-3 text-gray-700 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <button type="submit" className="w-full px-4 py-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors">
                    Voir mon cadeau !
                </button>
            </form>
        </div>
    );
};

const ResultScreen = ({ result }) => (
    <div className="w-full max-w-md p-10 text-center bg-white rounded-2xl shadow-lg transform transition-all duration-500 hover:scale-105">
        <div className="text-6xl mb-4">🎁</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Félicitations !</h2>
        <p className="text-lg text-gray-600 mb-4">Vous avez gagné :</p>
        <p className="text-2xl font-bold text-blue-600 bg-blue-100 px-4 py-2 rounded-lg">{result.gift}</p>
        <p className="mt-6 text-sm text-gray-500">Un commercial prendra contact avec vous bientôt.</p>
        <p className="mt-2 text-sm text-gray-500">Votre niveau : <span className="font-semibold">{result.level}</span></p>
    </div>
);


export default function QuizPage({ quiz, franchiseId, error, debugMode }) {
    const router = useRouter();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [quizFinished, setQuizFinished] = useState(false);
    const [leadSubmitted, setLeadSubmitted] = useState(false);
    const [finalResult, setFinalResult] = useState(null);

    if (error) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-100 text-red-500 font-bold text-xl">{error}</div>;
    }

    const handleAnswer = (points) => {
        setScore(score + points);
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            setQuizFinished(true);
        }
    };

    const handleFormSubmit = async (formData) => {
        const result = getQuizResult(score);
        setFinalResult(result);

        // In debug mode, we don't write to the database
        if (debugMode) {
             setLeadSubmitted(true);
             return;
        }

        try {
            await addDoc(collection(db, 'leads'), {
                ...formData,
                franchiseId: franchiseId,
                quizId: router.query.quizId,
                score: score,
                level: result.level,
                gift: result.gift,
                createdAt: serverTimestamp()
            });
            setLeadSubmitted(true);
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Une erreur est survenue. Veuillez réessayer.");
        }
    };

    const renderContent = () => {
        if (leadSubmitted) {
            return <ResultScreen result={finalResult} />;
        }
        if (quizFinished) {
            return <LeadForm onSubmit={handleFormSubmit} />;
        }
        return <QuestionCard question={quiz.questions[currentQuestionIndex]} onAnswer={handleAnswer} />;
    };

    return (
        <>
            <Head>
                <title>{quiz.title} | Quiz</title>
                <meta name="description" content={`Participez à notre quiz ludique: ${quiz.title}`} />
            </Head>
            <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
                {debugMode && (
                    <div className="w-full max-w-2xl p-4 mb-4 bg-yellow-300 text-yellow-800 font-bold text-center rounded-lg">
                        ⚠️ MODE DÉBOGAGE ACTIF - Les données sont factices.
                    </div>
                )}
                {!quizFinished && (
                    <div className="w-full max-w-2xl mb-4">
                        <div className="text-center mb-2 font-semibold text-blue-700">Question {currentQuestionIndex + 1} / {quiz.questions.length}</div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}></div>
                        </div>
                    </div>
                )}
                {renderContent()}
            </main>
        </>
    );
}

export async function getServerSideProps(context) {
    // START: DEBUGGING CODE
    // This part bypasses Firebase and uses fake data to ensure the page can be displayed.
    const fakeQuizData = {
        title: "Quiz de Test (Mode Débogage)",
        questions: [
            { questionText: "Quelle est la couleur du ciel ?", answers: [{ text: "Bleu", score: 1 }, { text: "Vert", score: 0 }] },
            { questionText: "Combien font 2+2 ?", answers: [{ text: "4", score: 1 }, { text: "5", score: 0 }] }
        ]
    };

    return {
        props: {
            quiz: fakeQuizData,
            franchiseId: "test-franchise-debug",
            debugMode: true, // This tells the component to show the debug banner
        },
    };
    // END: DEBUGGING CODE

    /*
    // --- ORIGINAL CODE IS COMMENTED OUT BELOW ---
    const { franchiseId, quizId } = context.params;

    try {
        const franchiseDocRef = doc(db, 'franchises', franchiseId);
        const franchiseDoc = await getDoc(franchiseDocRef);

        if (!franchiseDoc.exists()) {
            return { props: { error: "Ce lien de franchisé n'est pas valide." } };
        }
        
        const quizDocRef = doc(db, 'quizzes', quizId);
        const quizDoc = await getDoc(quizDocRef);

        if (!quizDoc.exists()) {
            return { props: { error: "Ce quiz n'existe pas." } };
        }
        
        const quizData = quizDoc.data();

        return {
            props: {
                quiz: quizData,
                franchiseId: franchiseId,
            },
        };
    } catch (error) {
        console.error("Error fetching data in getServerSideProps: ", error);
        return { props: { error: "Erreur de chargement du quiz. Vérifiez votre connexion ou contactez le support." } };
    }
    */
}
