import './App.css';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import {Toaster} from 'react-hot-toast';
import Home from './pages/Home';
import EditorPage from './pages/EditorPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import {RecoilRoot} from "recoil";
import {AuthProvider} from "./context/AuthContext";

function App() {

    return (
        <>
            <div>
                <Toaster
                    position="top-center"
                    toastOptions={{
                        success: {
                            theme: {
                                primary: '#4aed88',
                            },
                        },
                    }}
                ></Toaster>
            </div>
            <BrowserRouter>
                <AuthProvider>
                    <RecoilRoot>
                        <Routes>
                            <Route path="/" element={<Home />}></Route>
                            <Route path="/login" element={<Login />}></Route>
                            <Route path="/signup" element={<Signup />}></Route>
                            <Route
                                path="/editor/:roomId"
                                element={<EditorPage />}
                            ></Route>
                        </Routes>
                    </RecoilRoot>
                </AuthProvider>
            </BrowserRouter>
        </>
    );
}

export default App;