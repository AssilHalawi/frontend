/*
  React leaderboard code. 
  It loads the leaderboard from the API, sorts by XP, and shows the user's rank and a table.
*/

// Main leaderboard component: loads users and renders the table
const Leaderboard = () => {
  // list of users from the API
  const [users, setUsers] = React.useState([]);
  // loading flag while fetching
  const [loading, setLoading] = React.useState(true);

  // current logged-in user from localStorage
  const currentUser = JSON.parse(localStorage.getItem("steam.user"));

  // Load leaderboard from server once on mount
  React.useEffect(() => {
    fetch("https://backend-production-aaba.up.railway.app/api/leaderboard")
      .then(res => res.json())
      .then(data => {
        // sort by total XP descending
        const sorted = [...data].sort((a, b) => b.total_xp - a.total_xp);
        setUsers(sorted);
        setLoading(false);
      })
      .catch(err => {
        console.error("Leaderboard Fetch Error:", err);
        setLoading(false);
      });
  }, []);

  // Show loading state
  if (loading) return <h3 className="text-center">Loading leaderboard...</h3>;

  // Compute the current user's rank (1-based)
  const myRank = users.findIndex(u => u.email === currentUser.email) + 1;

  // Render the rank summary and the full table
  return (
    <div>
      <div className="text-center mb-5">
        <h2>Your Rank: <span className="text-primary">#{myRank}</span></h2>
        <p>Total XP: <strong>{users.find(u => u.email === currentUser.email)?.total_xp}</strong></p>
      </div>

      <table className="table table-striped table-hover">
        <thead className="table-dark">
          <tr>
            <th>Rank</th>
            <th>Email</th>
            <th>Total XP</th>
            <th>Questions Completed</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, index) => (
            <tr key={u.id} className={
              u.email === currentUser.email ? "highlight-row" : ""
            }>
              <td>#{index + 1}</td>
              <td>{u.email}</td>
              <td>{u.total_xp}</td>
              <td>{u.total_completed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Mount the leaderboard into the DOM
const root = ReactDOM.createRoot(document.getElementById("leaderboard-root"));
root.render(<Leaderboard />);
