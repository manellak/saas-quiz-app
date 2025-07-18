import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import Papa from 'papaparse';
import Head from 'next/head';

const LeadsTable = ({ leads }) => {
    if (leads.length === 0) {
        return <p className="text-center text-gray-500 mt-8">Aucun lead pour le moment. Partagez le lien du quiz !</p>;
    }

    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Niveau</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cadeau</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(lead.createdAt?.toDate()).toLocaleString('fr-FR')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.firstName} {lead.lastName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div>{lead.email}</div>
                                <div>{lead.phone}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lead.score}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${lead.level === 'Lead fort' ? 'bg-green-100 text-green-800' : lead.level === 'Lead moyen' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                    {lead.level}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.gift}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default function DashboardPage({ initialLeads, franchiseData, error }) {
    const router = useRouter();
    const { franchiseId } = router.query;
    const [leads, setLeads] = useState(initialLeads || []);
    const [quizLink, setQuizLink] = useState('');

    useEffect(() => {
        if (franchiseData?.activeQuizId) {
            const link = `${window.location.origin}/quiz/${franchiseId}/${franchiseData.activeQuizId}`;
            setQuizLink(link);
        }
    }, [franchiseId, franchiseData]);

    useEffect(() => {
        if (!franchiseId) return;

        const q = query(collection(db, "leads"), where("franchiseId", "==", franchiseId));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const leadsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Simple sort by date in memory
            leadsData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
            setLeads(leadsData);
        });

        return () => unsubscribe();
    }, [franchiseId]);

    const downloadCSV = () => {
        const csvData = leads.map(lead => ({
            "Date": new Date(lead.createdAt?.toDate()).toISOString(),
            "Prénom": lead.firstName,
            "Nom": lead.lastName,
            "Email": lead.email,
            "Téléphone": lead.phone,
            "Score": lead.score,
            "Niveau": lead.level,
            "Cadeau": lead.gift,
            "ID Quiz": lead.quizId
        }));
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `leads_${franchiseId}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (error) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-100 text-red-500 font-bold text-xl">{error}</div>;
    }

    return (
        <>
            <Head>
                <title>Dashboard | {franchiseData?.name || 'Franchisé'}</title>
            </Head>
            <div className="min-h-screen bg-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <header className="bg-white shadow rounded-lg p-6 mb-8">
                        <div className="md:flex md:items-center md:justify-between">
                            <div className="flex-1 min-w-0">
                                <h1 className="text-3xl font-bold leading-tight text-gray-900">
                                    Dashboard - {franchiseData.name}
                                </h1>
                            </div>
                            <div className="mt-4 flex md:mt-0 md:ml-4">
                                <button
                                    onClick={downloadCSV}
                                    disabled={leads.length === 0}
                                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    Exporter en CSV
                                </button>
                            </div>
                        </div>
                        {quizLink && (
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Lien du Quiz à partager :</label>
                                <div className="flex items-center space-x-2">
                                    <input type="text" readOnly value={quizLink} className="w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                                    <button onClick={() => navigator.clipboard.writeText(quizLink)} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">Copier</button>
                                </div>
                            </div>
                        )}
                    </header>
                    <main>
                        <LeadsTable leads={leads} />
                    </main>
                </div>
            </div>
        </>
    );
}

export async function getServerSideProps(context) {
    const { franchiseId } = context.params;

    try {
        const franchiseDocRef = doc(db, 'franchises', franchiseId);
        const franchiseDoc = await getDoc(franchiseDocRef);

        if (!franchiseDoc.exists()) {
            return { props: { error: "Ce tableau de bord n'existe pas." } };
        }

        const q = query(collection(db, "leads"), where("franchiseId", "==", franchiseId));
        const querySnapshot = await getDocs(q);
        const initialLeads = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt ? data.createdAt.toMillis() : null, // Serialize timestamp
            };
        });
        
        // Convert serialized timestamp back to Date object for sorting
        initialLeads.forEach(lead => {
            if (lead.createdAt) {
                lead.createdAt = { toDate: () => new Date(lead.createdAt) };
            }
        });
        initialLeads.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());

        return {
            props: {
                initialLeads: JSON.parse(JSON.stringify(initialLeads)), // Ensure serializable
                franchiseData: franchiseDoc.data(),
            },
        };
    } catch (error) {
        console.error("Error fetching dashboard data: ", error);
        return { props: { error: "Erreur de chargement des données." } };
    }
}
