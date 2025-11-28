/*
React code that fetches and shows the gifts a user bought in progress.html
*/

const { useState, useEffect } = React;

// fetches the user's gifts and renders a list
function GiftDisplay({ userId }) {
    // state: list of gift rows
    const [gifts, setGifts] = useState([]);
    // state: loading indicator
    const [loading, setLoading] = useState(true);

    // side effect: load gifts for the given user id
    useEffect(() => {
        fetch(`https://backend-production-aaba.up.railway.app/api/user-gifts/${userId}`)
            .then(res => res.json())
            .then(data => {
                setGifts(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Gift display error:", err);
                setLoading(false);
            });
    }, [userId]);

    // Render a simple loading message while fetching
    if (loading) return <p>Loading gifts...</p>;

    // If no gifts, show a short message
    if (gifts.length === 0)
        return <p>No gifts purchased yet.</p>;

    // Normal rendering: a list of gift names
    return (
        <div className="gift-display-box">
            <h4>🎁 Your Purchased Gifts</h4>
            <ul>
                {gifts.map((g, index) => (
                    <li key={index}>
                        {g.giftname}
                    </li>
                ))}
            </ul>
        </div>
    );
}

// Auto-mount: find the placeholder and render the component for current user
const root = document.getElementById("giftDisplayRoot");
if (root) {
    const user = JSON.parse(localStorage.getItem("steam.user"));
    if (user) {
        ReactDOM.render(<GiftDisplay userId={user.id} />, root);
    }
}
