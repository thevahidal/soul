<script>
  import { onMount } from 'svelte';

  let tables = [];
  let tablesLoading = true;

  let rows = [];
  let rowsLoading = false;

  let columns = [];
  let columnsLoading = false;

  onMount(async () => {
    fetch('http://localhost:8000/api/tables')
      .then((response) => response.json())
      .then(({ data }) => {
        tables = data;
        handleTableTabClick(data[0]?.name);
        tablesLoading = false;
      })
      .catch((error) => {
        console.log(error);
        return [];
      });
  });

  function handleTableTabClick(tableName) {
    rowsLoading = true;
    columnsLoading = true;
    fetch(`http://localhost:8000/api/tables/${tableName}`)
      .then((response) => response.json())
      .then(({ data }) => {
        console.log(data);
        columns = data;
        columnsLoading = false;
      })
      .catch((error) => {
        console.log(error);
        return [];
      });
    fetch(`http://localhost:8000/api/tables/${tableName}/rows`)
      .then((response) => response.json())
      .then(({ data }) => {
        console.log(data);
        rows = data;
        rowsLoading = false;
      })
      .catch((error) => {
        console.log(error);
        return [];
      });
  }

  function handleAddRecord() {

  }
</script>

<div class="wrapper">
  {#if tablesLoading}
    <p>Loading...</p>
  {:else}
    <ul class="tables">
      {#each tables as table}
        <li>
          <button on:click={handleTableTabClick(table.name)}>
            {table.name}
          </button>
        </li>
      {/each}
    </ul>
    <div class='options'>
        <button class='button'>
            Add record
        </button>
    </div>
    <div>
      <table cellspacing="0">
        <thead>
          <tr>
            {#each columns as column}
              <th>{column.name}</th>
            {/each}
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
        </tr>
        </thead>
        <tbody>
          {#each rows as row}
            <tr class='table-row'>
              {#each Object.keys(row) as key}
                <td>{row[key]}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .wrapper {
    background-color: #151515;
    min-height: 100vh;
    min-width: 100vw;
    color: #fff;

  }

  .wrapper * {
    font-family: 'Courier New', Courier, monospace !important;
  }

  ul.tables {
    margin: 0;
    list-style: none;
    padding: 0;
    display: flex;
    background-color: #111;
    border-bottom: 1px solid #333;
  }

  ul.tables li {
  }

  ul.tables li button {
    border: none;
    background: none;
    color: #fff;
    padding: 0 2rem;
    height: 35px;
    border-right: 1px solid #333;
    transition: 0.3s all;
  }

  ul.tables li button:hover {
    background: #222;
  }
  ul.tables li button.selected {
    border: none;
    background: none;
    color: #fff;
    padding: 0.5rem 2rem;
  }

  .options {
    padding: 1rem;
    display: flex;

  }

  thead {
    background-color: #111;
  }

  .button {
    border: none;
    background: #333;
    font-weight: bold;
    padding: 0 1rem;
    height: 30px;
    color: #fff;
    border-radius: 5px;
  }

  .button:hover {
    background: #444;
  }


  td,
  th {
    min-width: 200px;
    text-align: left;
    margin: 0;
    padding: 0 1rem;
    height: 35px;
    border-right: 1px solid #333;
    border-bottom: 1px solid #333;
  }
  th {
    border-top: 1px solid #333;
  }
  .table-row:hover {
    background: #222;
    transition: 0.3s all;
  }
</style>
