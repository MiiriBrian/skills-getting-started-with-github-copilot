document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      // disable caching so we always get the latest data after updates
      const response = await fetch("/activities", { cache: 'no-store' });
      const activities = await response.json();

      // Clear loading message and previous options
      activitiesList.innerHTML = "";

      // Reset activity select (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // show participants (titled section with avatars and bulleted list)
        let participantsHtml;
          if (details.participants.length) {
          const listItems = details.participants
            .map(p => {
              const namePart = p.split('@')[0].replace(/[._\-]/g, ' ');
              const initials = namePart
                .split(' ')
                .map(s => (s ? s[0].toUpperCase() : ''))
                .join('')
                .slice(0, 2);
              // Add a delete icon (button) with data attributes for activity and email
              return `<li class="participant-item">
                        <span class="avatar">${initials}</span>
                        <span class="participant-text">${namePart}</span>
                        <span class="participant-email">${p}</span>
                        <button class="delete-participant" title="Remove participant" data-activity="${name}" data-email="${p}">&#10006;</button>
                      </li>`;
            })
            .join('');
          participantsHtml = `<div class="participants-section">
               <h5 class="participants-title">Participants <span class="count">(${details.participants.length})</span></h5>
               <ul class="participants">
                 ${listItems}
               </ul>
             </div>`;
        } else {
          participantsHtml = `<div class="participants-section">
               <h5 class="participants-title">Participants</h5>
               <p class="info">No participants yet</p>
             </div>`;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;


        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

        if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities so participant lists and availability update
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Event delegation for delete participant
  document.addEventListener("click", async (event) => {
    if (event.target.classList.contains("delete-participant")) {
      const activity = event.target.getAttribute("data-activity");
      const email = event.target.getAttribute("data-email");
      if (confirm(`Remove ${email} from ${activity}?`)) {
        try {
          const response = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`, {
            method: "POST"
          });
          const result = await response.json();
          if (response.ok) {
            // Ensure the UI refreshes after server-side removal
            await fetchActivities();
            messageDiv.textContent = result.message || "Participant removed.";
            messageDiv.className = "success";
          } else {
            messageDiv.textContent = result.detail || "Failed to remove participant.";
            messageDiv.className = "error";
          }
          messageDiv.classList.remove("hidden");
          setTimeout(() => messageDiv.classList.add("hidden"), 5000);
        } catch (error) {
          messageDiv.textContent = "Error removing participant.";
          messageDiv.className = "error";
          messageDiv.classList.remove("hidden");
        }
      }
    }
  });

  // Initialize app
  fetchActivities();
});
