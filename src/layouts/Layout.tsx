
import { Link, Outlet } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function Layout() {
    return (
        <div className="app-container">
            <Helmet>
                <title>IDDDinner - Recipe Manager</title>
                <meta name="description" content="A personal collection of delicious recipes." />
                <meta property="og:title" content="IDDDinner" />
                <meta property="og:description" content="A personal collection of delicious recipes." />
                <meta property="og:type" content="website" />
            </Helmet>
            <header className="app-header">
                <div className="header-content">
                    <Link to="/" className="logo">
                        🍽️ IDDDinner
                    </Link>
                </div>
            </header>
            <main className="app-main">
                <Outlet />
            </main>
            <footer className="app-footer">
                <p>&copy; {new Date().getFullYear()} IDDD LLC<br/>A division of IDDD International Inc. GmbH</p>
            </footer>
        </div>
    );
}
