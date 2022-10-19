<script>
    import { onMount } from "svelte";
    let tables = []
    onMount(async () => {
        fetch("http://localhost:8000/api/tables")
            .then(response => response.json())
            .then(({ data }) => {
                    console.log(data);
                    tables = data;
            }).catch(error => {
                console.log(error);
                return [];
            });
    });
</script>

<h1>Welcome to Soul</h1>
{#each tables as table}
    <li>{table.name}</li>
{/each}