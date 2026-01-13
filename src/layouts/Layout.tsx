
import { Link, Outlet } from 'react-router-dom';

export default function Layout() {
    return (
        <div className="app-container">
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
                <p>&copy; {new Date().getFullYear()} IDDD LLC, a division of IDDD International Inc. GmbH</p>
            </footer>
        </div>
    );
}
